import type { LeadFieldDefinition, LeadFieldValueData } from "@/lib/leads/field-values";

export const IDEMPOTENCY_FIELD_KEY = "losono_submission_id";

export function fieldValuesFromKeys(
  fields: LeadFieldDefinition[],
  valuesByKey: Record<string, string | number | boolean | string[] | null>,
): LeadFieldValueData[] {
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));

  return Object.entries(valuesByKey).map(([key, value]) => {
    const field = fieldByKey.get(key);

    if (!field) {
      throw new Error(`Unknown field key: ${key}`);
    }

    return {
      fieldId: field.id,
      value,
    };
  });
}

export function mergeIdempotencyKey(
  fields: LeadFieldDefinition[],
  valuesByKey: Record<string, string | number | boolean | string[] | null>,
  idempotencyKey: string,
): Record<string, string | number | boolean | string[] | null> {
  const idempotencyField = fields.find((field) => field.key === IDEMPOTENCY_FIELD_KEY);

  if (!idempotencyField) {
    return valuesByKey;
  }

  const existing = valuesByKey[IDEMPOTENCY_FIELD_KEY];

  if (existing === null || existing === undefined || existing === "") {
    return {
      ...valuesByKey,
      [IDEMPOTENCY_FIELD_KEY]: idempotencyKey,
    };
  }

  return valuesByKey;
}
