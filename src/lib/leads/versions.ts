import type { LeadVersionChangeType, Prisma } from "@/generated/prisma/client";
import type { LeadFieldDefinition } from "@/lib/leads/field-values";
import { formatFieldValueForDisplay } from "@/lib/leads/field-values";

export type LeadVersionFieldSnapshot = {
  fieldId: string;
  value: string | number | boolean | string[] | null;
};

export type LeadSnapshot = {
  stageId: string;
  fieldValues: LeadVersionFieldSnapshot[];
};

type LeadDbClient = Pick<Prisma.TransactionClient, "lead" | "leadVersion" | "leadStage">;

function parseFieldSnapshotValue(value: unknown): LeadVersionFieldSnapshot["value"] {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }

  return null;
}

export function serializeFieldValues(
  fieldValues: Array<{ fieldId: string; value: unknown }>,
): LeadVersionFieldSnapshot[] {
  return fieldValues.map((fieldValue) => ({
    fieldId: fieldValue.fieldId,
    value: parseFieldSnapshotValue(fieldValue.value),
  }));
}

export async function getLeadSnapshot(
  leadId: string,
  client: LeadDbClient,
): Promise<LeadSnapshot | null> {
  const lead = await client.lead.findUnique({
    where: { id: leadId },
    select: {
      currentStageId: true,
      fieldValues: {
        select: {
          fieldId: true,
          value: true,
        },
      },
    },
  });

  if (!lead) {
    return null;
  }

  return {
    stageId: lead.currentStageId,
    fieldValues: serializeFieldValues(lead.fieldValues),
  };
}

function fieldValueMap(fieldValues: LeadVersionFieldSnapshot[]) {
  return new Map(fieldValues.map((fieldValue) => [fieldValue.fieldId, fieldValue.value]));
}

export function parseStoredFieldValues(value: unknown): LeadVersionFieldSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const fieldId = "fieldId" in item ? item.fieldId : null;
    if (typeof fieldId !== "string") {
      return [];
    }

    const rawValue = "value" in item ? item.value : null;
    return [{ fieldId, value: parseFieldSnapshotValue(rawValue) }];
  });
}

export function snapshotsEqual(left: LeadSnapshot, right: LeadSnapshot): boolean {
  if (left.stageId !== right.stageId) {
    return false;
  }

  const leftValues = fieldValueMap(left.fieldValues);
  const rightValues = fieldValueMap(right.fieldValues);
  const fieldIds = new Set([...leftValues.keys(), ...rightValues.keys()]);

  for (const fieldId of fieldIds) {
    if (
      JSON.stringify(leftValues.get(fieldId) ?? null) !==
      JSON.stringify(rightValues.get(fieldId) ?? null)
    ) {
      return false;
    }
  }

  return true;
}

export async function ensurePreviousSnapshotRecorded(
  input: {
    leadId: string;
    userId: string | null;
    snapshot: LeadSnapshot;
    fields: LeadFieldDefinition[];
    stageName?: string | null;
  },
  client: LeadDbClient,
) {
  const latestVersion = await client.leadVersion.findFirst({
    where: { leadId: input.leadId },
    orderBy: { createdAt: "desc" },
    select: {
      stageId: true,
      fieldValues: true,
    },
  });

  if (latestVersion) {
    const latestSnapshot: LeadSnapshot = {
      stageId: latestVersion.stageId ?? input.snapshot.stageId,
      fieldValues: parseStoredFieldValues(latestVersion.fieldValues),
    };

    if (snapshotsEqual(latestSnapshot, input.snapshot)) {
      return;
    }
  }

  await recordLeadVersion(
    {
      leadId: input.leadId,
      userId: input.userId,
      changeType: "CREATED",
      snapshot: input.snapshot,
      summary: input.stageName ? `At ${input.stageName}` : "Previous state",
    },
    client,
  );
}

export function parseStageMoveFromSummary(
  summary: string,
): { fromStageName: string; toStageName: string } | null {
  const match = summary.match(/^Moved from (.+?) to (.+?)(?:\s·\s|$)/);

  if (!match) {
    return null;
  }

  return {
    fromStageName: match[1].trim(),
    toStageName: match[2].trim(),
  };
}

export function buildVersionSummary(input: {
  changeType: LeadVersionChangeType;
  fields: LeadFieldDefinition[];
  previousSnapshot: LeadSnapshot | null;
  nextSnapshot: LeadSnapshot;
  previousStageName?: string | null;
  nextStageName?: string | null;
}): string {
  const { changeType, fields, previousSnapshot, nextSnapshot, previousStageName, nextStageName } =
    input;

  if (changeType === "CREATED") {
    return "Lead created";
  }

  if (changeType === "REVERTED") {
    return "Reverted to earlier version";
  }

  const parts: string[] = [];
  const stageChanged = previousSnapshot?.stageId !== nextSnapshot.stageId;

  if (stageChanged && previousStageName && nextStageName) {
    parts.push(`Moved from ${previousStageName} to ${nextStageName}`);
  } else if (stageChanged && nextStageName) {
    parts.push(`Moved to ${nextStageName}`);
  }

  if (previousSnapshot) {
    const previousValues = fieldValueMap(previousSnapshot.fieldValues);
    const nextValues = fieldValueMap(nextSnapshot.fieldValues);
    const changedLabels: string[] = [];

    for (const field of fields) {
      const previousValue = previousValues.get(field.id) ?? null;
      const nextValue = nextValues.get(field.id) ?? null;

      if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) {
        continue;
      }

      changedLabels.push(field.label);
    }

    if (changedLabels.length > 0) {
      if (changedLabels.length === 1) {
        parts.push(`Updated ${changedLabels[0]}`);
      } else if (changedLabels.length <= 3) {
        parts.push(`Updated ${changedLabels.join(", ")}`);
      } else {
        parts.push(`Updated ${changedLabels.length} fields`);
      }
    }
  }

  if (parts.length === 0) {
    if (changeType === "STAGE_MOVED") {
      return nextStageName ? `Moved to ${nextStageName}` : "Stage changed";
    }

    return "Lead updated";
  }

  return parts.join(" · ");
}

export async function recordLeadVersion(
  input: {
    leadId: string;
    userId: string | null;
    changeType: LeadVersionChangeType;
    snapshot: LeadSnapshot;
    summary: string;
    createdAt?: Date;
    stageName?: string | null;
    stageColor?: string | null;
  },
  client: LeadDbClient,
) {
  let stageName = input.stageName ?? null;
  let stageColor = input.stageColor ?? null;

  if (!stageName) {
    const stage = await client.leadStage.findUnique({
      where: { id: input.snapshot.stageId },
      select: { name: true, color: true },
    });
    stageName = stage?.name ?? "Removed stage";
    stageColor = stage?.color ?? null;
  }

  await client.leadVersion.create({
    data: {
      leadId: input.leadId,
      userId: input.userId,
      changeType: input.changeType,
      stageId: input.snapshot.stageId,
      stageName,
      stageColor,
      fieldValues: input.snapshot.fieldValues as Prisma.InputJsonValue,
      summary: input.summary,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  });
}

export async function ensureBaselineVersionIfMissing(
  input: {
    leadId: string;
    userId: string | null;
    snapshot: LeadSnapshot;
    fields: LeadFieldDefinition[];
    stageName?: string | null;
  },
  client: LeadDbClient,
) {
  await ensurePreviousSnapshotRecorded(input, client);
}

export function formatVersionFieldChange(
  field: LeadFieldDefinition,
  value: LeadVersionFieldSnapshot["value"],
): string {
  return `${field.label}: ${formatFieldValueForDisplay(value)}`;
}
