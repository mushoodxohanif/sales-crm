import type { PrismaClient } from "@/generated/prisma/client";
import type { LeadFieldDefinition, LeadFieldValueData } from "@/lib/leads/field-values";

type NormalizedValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "array"; value: string[] };

type DuplicateCheckClient = Pick<PrismaClient, "$queryRaw" | "leadFieldValue">;

export type DuplicateFieldValuesInput = {
  campaignId: string;
  fields: LeadFieldDefinition[];
  fieldValues: LeadFieldValueData[];
  excludeLeadId?: string;
  batchValues?: Map<string, Set<string>>;
  client?: DuplicateCheckClient;
};

function isEmptyValue(value: string | number | boolean | string[] | null): boolean {
  if (value === null || value === "") {
    return true;
  }

  return Array.isArray(value) && value.length === 0;
}

export function normalizeFieldValueForComparison(
  value: string | number | boolean | string[] | null,
): NormalizedValue | null {
  if (isEmptyValue(value)) {
    return null;
  }

  if (typeof value === "string") {
    return { kind: "string", value: value.trim().toLowerCase() };
  }

  if (typeof value === "number") {
    return { kind: "number", value };
  }

  if (typeof value === "boolean") {
    return { kind: "boolean", value };
  }

  if (Array.isArray(value)) {
    return {
      kind: "array",
      value: [...value].map((item) => item.trim().toLowerCase()).sort(),
    };
  }

  return null;
}

export function getFieldValueComparisonKey(
  value: string | number | boolean | string[] | null,
): string | null {
  const normalized = normalizeFieldValueForComparison(value);
  return normalized ? JSON.stringify(normalized) : null;
}

function normalizeStoredValue(value: unknown): NormalizedValue | null {
  if (typeof value === "string") {
    return { kind: "string", value: value.trim().toLowerCase() };
  }

  if (typeof value === "number") {
    return { kind: "number", value };
  }

  if (typeof value === "boolean") {
    return { kind: "boolean", value };
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return {
      kind: "array",
      value: [...value].map((item) => item.trim().toLowerCase()).sort(),
    };
  }

  return null;
}

function valuesMatch(left: NormalizedValue, right: NormalizedValue): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  switch (left.kind) {
    case "string":
      return left.value === (right as Extract<NormalizedValue, { kind: "string" }>).value;
    case "number":
      return left.value === (right as Extract<NormalizedValue, { kind: "number" }>).value;
    case "boolean":
      return left.value === (right as Extract<NormalizedValue, { kind: "boolean" }>).value;
    case "array": {
      const rightArray = (right as Extract<NormalizedValue, { kind: "array" }>).value;
      return (
        left.value.length === rightArray.length &&
        left.value.every((item, index) => item === rightArray[index])
      );
    }
    default:
      return false;
  }
}

async function hasExistingDuplicateInDatabase(
  client: DuplicateCheckClient,
  params: {
    campaignId: string;
    fieldId: string;
    normalized: NormalizedValue;
    excludeLeadId?: string;
  },
): Promise<boolean> {
  const { campaignId, fieldId, normalized, excludeLeadId } = params;

  if (normalized.kind === "string") {
    const rows = await client.$queryRaw<{ leadId: string }[]>`
      SELECT lfv."leadId"
      FROM "LeadFieldValue" lfv
      INNER JOIN "Lead" l ON l.id = lfv."leadId"
      WHERE l."campaignId" = ${campaignId}
        AND lfv."fieldId" = ${fieldId}
        AND (${excludeLeadId ?? null}::text IS NULL OR l.id <> ${excludeLeadId ?? null})
        AND jsonb_typeof(lfv.value::jsonb) = 'string'
        AND lower(lfv.value #>> '{}') = ${normalized.value}
      LIMIT 1
    `;

    return rows.length > 0;
  }

  if (normalized.kind === "number") {
    const rows = await client.$queryRaw<{ leadId: string }[]>`
      SELECT lfv."leadId"
      FROM "LeadFieldValue" lfv
      INNER JOIN "Lead" l ON l.id = lfv."leadId"
      WHERE l."campaignId" = ${campaignId}
        AND lfv."fieldId" = ${fieldId}
        AND (${excludeLeadId ?? null}::text IS NULL OR l.id <> ${excludeLeadId ?? null})
        AND lfv.value::jsonb = to_jsonb(${normalized.value}::numeric)
      LIMIT 1
    `;

    return rows.length > 0;
  }

  if (normalized.kind === "boolean") {
    const rows = await client.$queryRaw<{ leadId: string }[]>`
      SELECT lfv."leadId"
      FROM "LeadFieldValue" lfv
      INNER JOIN "Lead" l ON l.id = lfv."leadId"
      WHERE l."campaignId" = ${campaignId}
        AND lfv."fieldId" = ${fieldId}
        AND (${excludeLeadId ?? null}::text IS NULL OR l.id <> ${excludeLeadId ?? null})
        AND lfv.value::jsonb = to_jsonb(${normalized.value}::boolean)
      LIMIT 1
    `;

    return rows.length > 0;
  }

  const existingValues = await client.leadFieldValue.findMany({
    where: {
      fieldId,
      lead: {
        campaignId,
        ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
      },
    },
    select: { value: true },
  });

  return existingValues.some((fieldValue) => {
    const stored = normalizeStoredValue(fieldValue.value);
    return stored !== null && valuesMatch(stored, normalized);
  });
}

function hasDuplicateInBatch(
  batchValues: Map<string, Set<string>> | undefined,
  fieldId: string,
  comparisonKey: string,
): boolean {
  return batchValues?.get(fieldId)?.has(comparisonKey) ?? false;
}

export function recordBatchFieldValues(
  batchValues: Map<string, Set<string>>,
  fields: LeadFieldDefinition[],
  fieldValues: LeadFieldValueData[],
): void {
  const valueByFieldId = new Map(
    fieldValues.map((fieldValue) => [fieldValue.fieldId, fieldValue.value]),
  );

  for (const field of fields) {
    if (!field.isUnique) {
      continue;
    }

    const comparisonKey = getFieldValueComparisonKey(valueByFieldId.get(field.id) ?? null);
    if (!comparisonKey) {
      continue;
    }

    const existing = batchValues.get(field.id) ?? new Set<string>();
    existing.add(comparisonKey);
    batchValues.set(field.id, existing);
  }
}

export async function findDuplicateFieldLabel(
  input: DuplicateFieldValuesInput,
): Promise<string | null> {
  const client = input.client;
  if (!client) {
    throw new Error("Duplicate check requires a database client.");
  }

  const valueByFieldId = new Map(
    input.fieldValues.map((fieldValue) => [fieldValue.fieldId, fieldValue.value]),
  );

  for (const field of input.fields) {
    if (!field.isUnique) {
      continue;
    }

    const rawValue = valueByFieldId.get(field.id) ?? null;
    const normalized = normalizeFieldValueForComparison(rawValue);
    if (!normalized) {
      continue;
    }

    const comparisonKey = JSON.stringify(normalized);

    if (hasDuplicateInBatch(input.batchValues, field.id, comparisonKey)) {
      return field.label;
    }

    const exists = await hasExistingDuplicateInDatabase(client, {
      campaignId: input.campaignId,
      fieldId: field.id,
      normalized,
      excludeLeadId: input.excludeLeadId,
    });

    if (exists) {
      return field.label;
    }
  }

  return null;
}

export async function assertNoDuplicateFieldValues(
  input: DuplicateFieldValuesInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const duplicateLabel = await findDuplicateFieldLabel(input);

  if (duplicateLabel) {
    return {
      success: false,
      error: `A lead with this ${duplicateLabel} already exists in this campaign.`,
    };
  }

  return { success: true };
}

export type ImportBatchDuplicateTracker = Map<string, Set<string>>;

export function createImportBatchDuplicateTracker(): ImportBatchDuplicateTracker {
  return new Map();
}
