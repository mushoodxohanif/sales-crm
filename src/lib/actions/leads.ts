"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { CampaignStatus, type Prisma } from "@/generated/prisma/client";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import { db } from "@/lib/db";
import { toFieldDefinitions } from "@/lib/leads/field-values";
import { validateLeadFieldValues } from "@/lib/leads/validation";
import {
  createLeadSchema,
  deleteLeadSchema,
  moveLeadToStageSchema,
  updateLeadSchema,
} from "@/lib/validators/lead";

async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    return actionError("You must be signed in to perform this action.");
  }

  return null;
}

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input.";
}

function revalidateLeadPaths(campaignId: string, leadId?: string) {
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/leads/new`);

  if (leadId) {
    revalidatePath(`/campaigns/${campaignId}/leads/${leadId}`);
  }
}

function toJsonValue(value: string | number | boolean | string[]): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function getActiveCampaign(campaignId: string) {
  return db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      campaignType: {
        include: {
          fields: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      stages: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

async function assertStageBelongsToCampaign(stageId: string, campaignId: string) {
  const stage = await db.leadStage.findFirst({
    where: { id: stageId, campaignId },
    select: { id: true },
  });

  return stage !== null;
}

export async function createLead(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = createLeadSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { campaignId, currentStageId, fieldValues } = parsed.data;
  const campaign = await getActiveCampaign(campaignId);

  if (!campaign) {
    return actionError("Campaign not found.");
  }

  if (campaign.status === CampaignStatus.ARCHIVED) {
    return actionError("Cannot add leads to an archived campaign.");
  }

  const fields = toFieldDefinitions(campaign.campaignType.fields);
  const validation = validateLeadFieldValues(fields, fieldValues);

  if (!validation.success) {
    return actionError(validation.error);
  }

  const stageId =
    currentStageId ??
    campaign.stages.find((stage) => stage.isDefault)?.id ??
    campaign.stages[0]?.id;

  if (!stageId) {
    return actionError("Campaign has no pipeline stages.");
  }

  if (currentStageId) {
    const stageValid = await assertStageBelongsToCampaign(currentStageId, campaignId);
    if (!stageValid) {
      return actionError("Selected stage does not belong to this campaign.");
    }
  }

  const lead = await db.lead.create({
    data: {
      campaignId,
      currentStageId: stageId,
      fieldValues: {
        create: validation.normalized
          .filter((fieldValue) => fieldValue.value !== null)
          .map((fieldValue) => ({
            fieldId: fieldValue.fieldId,
            value: toJsonValue(fieldValue.value as string | number | boolean | string[]),
          })),
      },
    },
    select: { id: true },
  });

  revalidateLeadPaths(campaignId, lead.id);

  return actionSuccess({ id: lead.id });
}

export async function updateLead(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = updateLeadSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { id, currentStageId, fieldValues } = parsed.data;

  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      campaign: {
        include: {
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
    return actionError("Cannot edit leads in an archived campaign.");
  }

  if (currentStageId) {
    const stageValid = await assertStageBelongsToCampaign(currentStageId, lead.campaignId);
    if (!stageValid) {
      return actionError("Selected stage does not belong to this campaign.");
    }
  }

  let normalizedFieldValues:
    | Array<{ fieldId: string; value: string | number | boolean | string[] | null }>
    | undefined;

  if (fieldValues) {
    const fields = toFieldDefinitions(lead.campaign.campaignType.fields);
    const validation = validateLeadFieldValues(fields, fieldValues);

    if (!validation.success) {
      return actionError(validation.error);
    }

    normalizedFieldValues = validation.normalized;
  }

  await db.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id },
      data: {
        ...(currentStageId ? { currentStageId } : {}),
      },
    });

    if (normalizedFieldValues) {
      for (const fieldValue of normalizedFieldValues) {
        if (fieldValue.value === null) {
          await tx.leadFieldValue.deleteMany({
            where: {
              leadId: id,
              fieldId: fieldValue.fieldId,
            },
          });
          continue;
        }

        await tx.leadFieldValue.upsert({
          where: {
            leadId_fieldId: {
              leadId: id,
              fieldId: fieldValue.fieldId,
            },
          },
          create: {
            leadId: id,
            fieldId: fieldValue.fieldId,
            value: toJsonValue(fieldValue.value as string | number | boolean | string[]),
          },
          update: {
            value: toJsonValue(fieldValue.value as string | number | boolean | string[]),
          },
        });
      }
    }
  });

  revalidateLeadPaths(lead.campaignId, id);

  return actionSuccess({ id });
}

export async function moveLeadToStage(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = moveLeadToStageSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { leadId, stageId } = parsed.data;

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      campaignId: true,
      campaign: {
        select: { status: true },
      },
    },
  });

  if (!lead) {
    return actionError("Lead not found.");
  }

  if (lead.campaign.status === CampaignStatus.ARCHIVED) {
    return actionError("Cannot move leads in an archived campaign.");
  }

  const stageValid = await assertStageBelongsToCampaign(stageId, lead.campaignId);
  if (!stageValid) {
    return actionError("Selected stage does not belong to this campaign.");
  }

  await db.lead.update({
    where: { id: leadId },
    data: { currentStageId: stageId },
  });

  revalidateLeadPaths(lead.campaignId, leadId);

  return actionSuccess({ id: leadId });
}

export async function deleteLead(input: unknown): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = deleteLeadSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { id } = parsed.data;

  const lead = await db.lead.findUnique({
    where: { id },
    select: { id: true, campaignId: true },
  });

  if (!lead) {
    return actionError("Lead not found.");
  }

  await db.lead.delete({
    where: { id },
  });

  revalidateLeadPaths(lead.campaignId);

  return actionSuccess(undefined);
}
