export const FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "EMAIL",
  "PHONE",
  "URL",
  "NUMBER",
  "DATE",
  "SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
] as const;

export type FieldTypeValue = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldTypeValue, string> = {
  TEXT: "Text",
  TEXTAREA: "Long text",
  EMAIL: "Email",
  PHONE: "Phone",
  URL: "URL",
  NUMBER: "Number",
  DATE: "Date",
  SELECT: "Single select",
  MULTI_SELECT: "Multi select",
  CHECKBOX: "Checkbox",
};

export const FIELD_TYPE_OPTIONS = FIELD_TYPES.map((value) => ({
  value,
  label: FIELD_TYPE_LABELS[value],
}));

export function fieldTypeRequiresOptions(fieldType: FieldTypeValue) {
  return fieldType === "SELECT" || fieldType === "MULTI_SELECT";
}

export type FieldBuilderValue = {
  clientId: string;
  id?: string;
  key: string;
  label: string;
  fieldType: FieldTypeValue;
  required: boolean;
  sortOrder: number;
  options: string[];
};

export function createEmptyField(sortOrder: number): FieldBuilderValue {
  return {
    clientId: globalThis.crypto.randomUUID(),
    key: "",
    label: "",
    fieldType: "TEXT",
    required: false,
    sortOrder,
    options: [],
  };
}

export function parseOptionsInput(value: string) {
  return value
    .split(/[\n,]/)
    .map((option) => option.trim())
    .filter(Boolean);
}

export function formatOptionsInput(options: string[]) {
  return options.join("\n");
}

export function fieldBuilderToInput(field: FieldBuilderValue) {
  return {
    ...(field.id ? { id: field.id } : {}),
    key: field.key,
    label: field.label,
    fieldType: field.fieldType,
    required: field.required,
    sortOrder: field.sortOrder,
    ...(fieldTypeRequiresOptions(field.fieldType) ? { options: field.options } : {}),
  };
}
