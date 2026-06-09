import type { FieldTypeValue } from "@/lib/campaign-types/fields";

export type LeadFieldValueData = {
  fieldId: string;
  value: string | number | boolean | string[] | null;
};

export type LeadFieldDefinition = {
  id: string;
  key: string;
  label: string;
  fieldType: FieldTypeValue;
  required: boolean;
  showOnKanbanCard: boolean;
  sortOrder: number;
  options: string[];
};

export function parseFieldOptions(options: unknown): string[] {
  if (!options || !Array.isArray(options)) {
    return [];
  }

  return options.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function toFieldDefinitions(
  fields: Array<{
    id: string;
    key: string;
    label: string;
    fieldType: FieldTypeValue;
    required: boolean;
    showOnKanbanCard: boolean;
    sortOrder: number;
    options: unknown;
  }>,
): LeadFieldDefinition[] {
  return fields.map((field) => ({
    id: field.id,
    key: field.key,
    label: field.label,
    fieldType: field.fieldType,
    required: field.required,
    showOnKanbanCard: field.showOnKanbanCard,
    sortOrder: field.sortOrder,
    options: parseFieldOptions(field.options),
  }));
}

export function fieldValuesToMap(
  fieldValues: Array<{ fieldId: string; value: unknown }>,
): Record<string, string | number | boolean | string[] | null> {
  const map: Record<string, string | number | boolean | string[] | null> = {};

  for (const fieldValue of fieldValues) {
    const value = fieldValue.value;

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      map[fieldValue.fieldId] = value;
      continue;
    }

    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      map[fieldValue.fieldId] = value;
    }
  }

  return map;
}

export function mapToFieldValues(
  fields: LeadFieldDefinition[],
  values: Record<string, string | number | boolean | string[] | null>,
): LeadFieldValueData[] {
  return fields.map((field) => ({
    fieldId: field.id,
    value: values[field.id] ?? null,
  }));
}

export function getKanbanCardFields(fields: LeadFieldDefinition[]): LeadFieldDefinition[] {
  return fields
    .filter((field) => field.showOnKanbanCard)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getLeadDisplayTitle(
  fields: LeadFieldDefinition[],
  fieldValues: Array<{ fieldId: string; value: unknown }>,
): string {
  const valueByFieldId = new Map(
    fieldValues.map((fieldValue) => [fieldValue.fieldId, fieldValue.value]),
  );
  const candidates = fields.filter((field) => field.required);
  const searchFields = candidates.length > 0 ? candidates : fields;

  for (const field of searchFields) {
    const value = valueByFieldId.get(field.id);

    if (value === null || value === undefined || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        return value.join(", ");
      }
      continue;
    }

    if (typeof value === "boolean") {
      return value ? field.label : "Untitled lead";
    }

    return String(value);
  }

  return "Untitled lead";
}

export function formatFieldValueForDisplay(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}
