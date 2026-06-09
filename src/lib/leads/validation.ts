import { z } from "zod";
import type { LeadFieldDefinition, LeadFieldValueData } from "@/lib/leads/field-values";

export type { LeadFieldValueData };

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (value === "") {
    return true;
  }

  return Array.isArray(value) && value.length === 0;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value.includes("://") ? value : `https://${value}`);
    return true;
  } catch {
    return false;
  }
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function fieldValueSchema(field: LeadFieldDefinition): z.ZodType<unknown> {
  switch (field.fieldType) {
    case "CHECKBOX":
      return z.boolean();
    case "EMAIL":
      return z.string().trim().email(`${field.label} must be a valid email.`);
    case "URL":
      return z.string().trim().refine(isValidUrl, `${field.label} must be a valid URL.`);
    case "NUMBER":
      return z.union([z.number(), z.string()]).refine((value) => parseNumber(value) !== null, {
        message: `${field.label} must be a valid number.`,
      });
    case "DATE":
      return z.string().trim().refine(isValidDate, `${field.label} must be a valid date.`);
    case "SELECT":
      if (field.options.length > 0) {
        return z.enum(field.options as [string, ...string[]], {
          message: `${field.label} must be one of the allowed options.`,
        });
      }
      return z.string().trim().min(1, `${field.label} is required.`);
    case "MULTI_SELECT": {
      let schema = z.array(z.string().trim().min(1));
      if (field.options.length > 0) {
        schema = schema.refine(
          (values) => values.every((item) => field.options.includes(item)),
          `${field.label} contains an invalid option.`,
        );
      }
      return schema;
    }
    default:
      return z
        .string()
        .trim()
        .min(field.required ? 1 : 0, `${field.label} is required.`);
  }
}

export function buildLeadValidationSchema(fields: LeadFieldDefinition[]) {
  const fieldIds = new Set(fields.map((field) => field.id));

  return z
    .array(
      z.object({
        fieldId: z.string().refine((id) => fieldIds.has(id), "Unknown field in submission."),
        value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
      }),
    )
    .superRefine((fieldValues, context) => {
      const valueByFieldId = new Map(
        fieldValues.map((fieldValue) => [fieldValue.fieldId, fieldValue.value]),
      );

      for (const field of fields) {
        const raw = valueByFieldId.get(field.id);

        if (field.fieldType === "CHECKBOX") {
          if (field.required && raw !== true) {
            context.addIssue({
              code: "custom",
              message: `${field.label} must be checked.`,
            });
          }
          continue;
        }

        if (isEmptyValue(raw)) {
          if (field.required) {
            context.addIssue({
              code: "custom",
              message: `${field.label} is required.`,
            });
          }
          continue;
        }

        const result = fieldValueSchema(field).safeParse(raw);
        if (!result.success) {
          context.addIssue({
            code: "custom",
            message: result.error.issues[0]?.message ?? `${field.label} is invalid.`,
          });
        }
      }
    });
}

export function validateLeadFieldValues(
  fields: LeadFieldDefinition[],
  fieldValues: LeadFieldValueData[],
): { success: true; normalized: LeadFieldValueData[] } | { success: false; error: string } {
  const schema = buildLeadValidationSchema(fields);
  const validation = schema.safeParse(fieldValues);

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message ?? "Invalid field values.",
    };
  }

  const valueByFieldId = new Map(
    fieldValues.map((fieldValue) => [fieldValue.fieldId, fieldValue.value]),
  );
  const normalized: LeadFieldValueData[] = [];

  for (const field of fields) {
    const raw = valueByFieldId.get(field.id);

    if (field.fieldType === "CHECKBOX") {
      normalized.push({ fieldId: field.id, value: raw === true });
      continue;
    }

    if (isEmptyValue(raw)) {
      normalized.push({ fieldId: field.id, value: null });
      continue;
    }

    switch (field.fieldType) {
      case "TEXT":
      case "TEXTAREA":
      case "PHONE":
      case "EMAIL":
      case "URL":
      case "DATE":
      case "SELECT": {
        normalized.push({ fieldId: field.id, value: String(raw).trim() });
        break;
      }
      case "NUMBER": {
        const value = parseNumber(raw);
        normalized.push({ fieldId: field.id, value: value ?? String(raw).trim() });
        break;
      }
      case "MULTI_SELECT": {
        const values = Array.isArray(raw)
          ? raw.map((item) => String(item).trim()).filter(Boolean)
          : [];
        normalized.push({ fieldId: field.id, value: values });
        break;
      }
      default:
        normalized.push({ fieldId: field.id, value: String(raw) });
    }
  }

  return { success: true, normalized };
}
