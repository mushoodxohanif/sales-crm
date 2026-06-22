"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { CampaignStatus, type Prisma } from "@/generated/prisma/client";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import { db, interactiveTransactionOptions } from "@/lib/db";
import { assertNoDuplicateFieldValues } from "@/lib/leads/duplicates";
import { toFieldDefinitions } from "@/lib/leads/field-values";
import { recordStageTransition } from "@/lib/leads/stage-transitions";
import {
  buildVersionSummary,
  getLeadSnapshot,
  type LeadVersionFieldSnapshot,
  parseStageMoveFromSummary,
  parseStoredFieldValues,
  recordLeadVersion,
  snapshotsEqual,
} from "@/lib/leads/versions";

export type LeadVersionPayload = {
  id: string;
  leadId: string;
  changeType: "CREATED" | "UPDATED" | "STAGE_MOVED" | "REVERTED";
  summary: string;
  stageId: string;
  stageName: string;
  stageColor: string | null;
  fieldValues: LeadVersionFieldSnapshot[];
  createdAt: string;
  isCurrent: boolean;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
};

export type RevertedLeadPayload = {
  id: string;
  currentStageId: string;
  fieldValues: LeadVersionFieldSnapshot[];
  updatedAt: string;
};

const revertLeadVersionSchema = z.object({
  leadId: z.string().cuid(),
  versionId: z.string().cuid(),
  allowCreationTarget: z.boolean().optional(),
});

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function revalidateLeadPaths(campaignId: string, leadId?: string) {
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/leads/new`);
  revalidatePath("/targets");
  revalidatePath("/dashboard");

  if (leadId) {
    revalidatePath(`/campaigns/${campaignId}/leads/${leadId}`);
  }
}

function toJsonValue(value: string | number | boolean | string[]): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function backfillMissingPreviousVersions(leadId: string, userId: string) {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: {
      campaignId: true,
      campaign: {
        select: {
          stages: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!lead) {
    return;
  }

  const versions = await db.leadVersion.findMany({
    where: { leadId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      changeType: true,
      summary: true,
      stageId: true,
      fieldValues: true,
      createdAt: true,
    },
  });

  if (versions.length !== 1) {
    return;
  }

  const onlyVersion = versions[0];
  const fieldValues = parseStoredFieldValues(onlyVersion.fieldValues);
  const stageMove = parseStageMoveFromSummary(onlyVersion.summary);

  if (!stageMove || onlyVersion.changeType !== "STAGE_MOVED") {
    return;
  }

  const fromStage = lead.campaign.stages.find((stage) => stage.name === stageMove.fromStageName);

  if (!fromStage || fromStage.id === onlyVersion.stageId) {
    return;
  }

  const previousSnapshot = {
    stageId: fromStage.id,
    fieldValues,
  };

  const currentSnapshot = {
    stageId: onlyVersion.stageId,
    fieldValues,
  };

  if (snapshotsEqual(previousSnapshot, currentSnapshot)) {
    return;
  }

  await recordLeadVersion(
    {
      leadId,
      userId,
      changeType: "CREATED",
      snapshot: previousSnapshot,
      summary: `At ${stageMove.fromStageName}`,
      createdAt: new Date(onlyVersion.createdAt.getTime() - 1),
    },
    db,
  );
}

async function repairMisorderedBaselineVersions(leadId: string) {
  const versions = await db.leadVersion.findMany({
    where: { leadId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      changeType: true,
      summary: true,
      stageId: true,
      createdAt: true,
    },
  });

  for (const version of versions) {
    if (version.changeType !== "CREATED" || !version.summary.startsWith("At ")) {
      continue;
    }

    const baselineStageName = version.summary.slice(3).trim();

    for (const other of versions) {
      if (other.id === version.id || other.createdAt >= version.createdAt) {
        continue;
      }

      const stageMove = parseStageMoveFromSummary(other.summary);

      if (
        stageMove &&
        stageMove.fromStageName === baselineStageName &&
        other.stageId !== version.stageId
      ) {
        await db.leadVersion.update({
          where: { id: version.id },
          data: { createdAt: new Date(other.createdAt.getTime() - 1) },
        });
        break;
      }
    }
  }
}

function serializeVersions(
  versions: Array<{
    id: string;
    leadId: string;
    changeType: "CREATED" | "UPDATED" | "STAGE_MOVED" | "REVERTED";
    summary: string;
    stageId: string;
    fieldValues: unknown;
    createdAt: Date;
    stage: {
      id: string;
      name: string;
      color: string | null;
    };
    user: {
      id: string;
      name: string | null;
      image: string | null;
    } | null;
  }>,
  currentSnapshot: { stageId: string; fieldValues: LeadVersionFieldSnapshot[] },
): LeadVersionPayload[] {
  const serialized = versions.map((version) => {
    const versionSnapshot = {
      stageId: version.stageId,
      fieldValues: parseStoredFieldValues(version.fieldValues),
    };

    return {
      id: version.id,
      leadId: version.leadId,
      changeType: version.changeType,
      summary: version.summary,
      stageId: version.stageId,
      stageName: version.stage.name,
      stageColor: version.stage.color,
      fieldValues: versionSnapshot.fieldValues,
      createdAt: version.createdAt.toISOString(),
      isCurrent: false,
      user: version.user,
    };
  });

  const currentIndex = serialized.findIndex((_version, index) =>
    snapshotsEqual(
      {
        stageId: versions[index].stageId,
        fieldValues: parseStoredFieldValues(versions[index].fieldValues),
      },
      currentSnapshot,
    ),
  );

  if (currentIndex >= 0) {
    serialized[currentIndex].isCurrent = true;
  } else if (serialized.length > 0) {
    serialized[0].isCurrent = true;
  }

  return serialized;
}

async function loadLeadVersions(leadId: string) {
  return db.leadVersion.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    include: {
      stage: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });
}

export async function fetchLeadVersions(
  leadId: string,
): Promise<ActionResult<LeadVersionPayload[]>> {
  const userId = await requireUserId();

  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  if (!leadId) {
    return actionError("Lead id is required.");
  }

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true },
  });

  if (!lead) {
    return actionError("Lead not found.");
  }

  await backfillMissingPreviousVersions(leadId, userId);
  await repairMisorderedBaselineVersions(leadId);

  const currentSnapshot = await getLeadSnapshot(leadId, db);

  if (!currentSnapshot) {
    return actionError("Lead not found.");
  }

  const versions = await loadLeadVersions(leadId);

  return actionSuccess(serializeVersions(versions, currentSnapshot));
}

export async function revertLeadToVersion(input: unknown): Promise<
  ActionResult<{
    lead: RevertedLeadPayload;
    campaignId: string;
  }>
> {
  const userId = await requireUserId();

  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = revertLeadVersionSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { leadId, versionId, allowCreationTarget } = parsed.data;

  const version = await db.leadVersion.findFirst({
    where: {
      id: versionId,
      leadId,
    },
    include: {
      stage: {
        select: {
          id: true,
          name: true,
          campaignId: true,
        },
      },
    },
  });

  if (!version) {
    return actionError("Version not found.");
  }

  if (version.changeType === "CREATED" && !allowCreationTarget) {
    return actionError("Lead creation cannot be restored from history.");
  }

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      currentStageId: true,
      campaignId: true,
      campaign: {
        select: {
          status: true,
          campaignType: {
            include: {
              fields: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!lead) {
    return actionError("Lead not found.");
  }

  if (lead.campaign.status === CampaignStatus.ARCHIVED) {
    return actionError("Cannot revert leads in an archived campaign.");
  }

  const latestVersion = await db.leadVersion.findFirst({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (latestVersion?.id === versionId) {
    return actionError("This is already the current version.");
  }

  const fields = toFieldDefinitions(lead.campaign.campaignType.fields);
  const targetFieldValues = parseStoredFieldValues(version.fieldValues);
  const targetStageId = version.stageId;

  const duplicateCheck = await assertNoDuplicateFieldValues({
    campaignId: lead.campaignId,
    fields,
    fieldValues: targetFieldValues,
    excludeLeadId: leadId,
    client: db,
  });

  if (!duplicateCheck.success) {
    return actionError(duplicateCheck.error);
  }

  const previousSnapshot = await getLeadSnapshot(leadId, db);
  const updatedAt = new Date();
  const previousFieldValues = new Map(
    (previousSnapshot?.fieldValues ?? []).map((fieldValue) => [
      fieldValue.fieldId,
      fieldValue.value,
    ]),
  );

  await db.$transaction(async (tx) => {
    if (targetStageId !== lead.currentStageId) {
      await tx.lead.update({
        where: { id: leadId },
        data: {
          currentStageId: targetStageId,
          updatedAt,
        },
      });

      await recordStageTransition(
        {
          leadId,
          fromStageId: lead.currentStageId,
          toStageId: targetStageId,
          userId,
        },
        tx,
      );
    } else {
      await tx.lead.update({
        where: { id: leadId },
        data: { updatedAt },
      });
    }

    for (const field of fields) {
      const targetValue =
        targetFieldValues.find((item) => item.fieldId === field.id)?.value ?? null;
      const currentValue = previousFieldValues.get(field.id) ?? null;

      if (JSON.stringify(targetValue) === JSON.stringify(currentValue)) {
        continue;
      }

      if (targetValue === null) {
        await tx.leadFieldValue.deleteMany({
          where: {
            leadId,
            fieldId: field.id,
          },
        });
        continue;
      }

      await tx.leadFieldValue.upsert({
        where: {
          leadId_fieldId: {
            leadId,
            fieldId: field.id,
          },
        },
        create: {
          leadId,
          fieldId: field.id,
          value: toJsonValue(targetValue as string | number | boolean | string[]),
        },
        update: {
          value: toJsonValue(targetValue as string | number | boolean | string[]),
        },
      });
    }

    const nextSnapshot = {
      stageId: targetStageId,
      fieldValues: targetFieldValues,
    };

    await recordLeadVersion(
      {
        leadId,
        userId,
        changeType: "REVERTED",
        snapshot: nextSnapshot,
        summary: buildVersionSummary({
          changeType: "REVERTED",
          fields,
          previousSnapshot,
          nextSnapshot,
          previousStageName: null,
          nextStageName: version.stage.name,
        }),
      },
      tx,
    );
  }, interactiveTransactionOptions);

  revalidateLeadPaths(lead.campaignId, leadId);

  return actionSuccess({
    campaignId: lead.campaignId,
    lead: {
      id: leadId,
      currentStageId: targetStageId,
      fieldValues: targetFieldValues,
      updatedAt: updatedAt.toISOString(),
    },
  });
}
