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

export const MAX_KANBAN_CARD_FIELDS = 3;

export type FieldBuilderValue = {
  clientId: string;
  id?: string;
  key: string;
  label: string;
  fieldType: FieldTypeValue;
  required: boolean;
  showOnKanbanCard: boolean;
  isUnique: boolean;
  sortOrder: number;
  options: string[];
};

export type FieldGroupBuilderValue = {
  clientId: string;
  id?: string;
  label: string;
  fields: FieldBuilderValue[];
};

export type FieldBuilderBlock =
  | { type: "field"; field: FieldBuilderValue }
  | { type: "group"; group: FieldGroupBuilderValue };

export function createEmptyField(sortOrder: number): FieldBuilderValue {
  return {
    clientId: globalThis.crypto.randomUUID(),
    key: "",
    label: "",
    fieldType: "TEXT",
    required: false,
    showOnKanbanCard: false,
    isUnique: false,
    sortOrder,
    options: [],
  };
}

export function createEmptyGroup(fields: FieldBuilderValue[]): FieldGroupBuilderValue {
  return {
    clientId: globalThis.crypto.randomUUID(),
    label: "New group",
    fields: fields.map((field, index) => ({ ...field, sortOrder: index })),
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
    showOnKanbanCard: field.showOnKanbanCard,
    isUnique: field.isUnique,
    sortOrder: field.sortOrder,
    ...(fieldTypeRequiresOptions(field.fieldType) ? { options: field.options } : {}),
  };
}

export function reorderBlockFields(blocks: FieldBuilderBlock[]): FieldBuilderBlock[] {
  let sortOrder = 0;

  return blocks.map((block) => {
    if (block.type === "field") {
      const next = { ...block, field: { ...block.field, sortOrder } };
      sortOrder += 1;
      return next;
    }

    const fields = block.group.fields.map((field) => {
      const next = { ...field, sortOrder };
      sortOrder += 1;
      return next;
    });

    return { type: "group" as const, group: { ...block.group, fields } };
  });
}

export function flattenBlocks(blocks: FieldBuilderBlock[]): FieldBuilderValue[] {
  const fields: FieldBuilderValue[] = [];

  for (const block of blocks) {
    if (block.type === "field") {
      fields.push(block.field);
      continue;
    }

    fields.push(...block.group.fields);
  }

  return fields;
}

export function collectSelectedFieldIds(
  blocks: FieldBuilderBlock[],
  selectedIds: Set<string>,
): FieldBuilderValue[] {
  const selected: FieldBuilderValue[] = [];

  for (const block of blocks) {
    if (block.type === "field") {
      if (selectedIds.has(block.field.clientId)) {
        selected.push(block.field);
      }
      continue;
    }

    for (const field of block.group.fields) {
      if (selectedIds.has(field.clientId)) {
        selected.push(field);
      }
    }
  }

  return selected;
}

export function removeFieldsFromBlocks(
  blocks: FieldBuilderBlock[],
  clientIds: Set<string>,
): FieldBuilderBlock[] {
  const next: FieldBuilderBlock[] = [];

  for (const block of blocks) {
    if (block.type === "field") {
      if (!clientIds.has(block.field.clientId)) {
        next.push(block);
      }
      continue;
    }

    const fields = block.group.fields.filter((field) => !clientIds.has(field.clientId));

    if (fields.length === 0) {
      continue;
    }

    if (fields.length === 1) {
      next.push({ type: "field", field: fields[0] });
      continue;
    }

    next.push({ type: "group", group: { ...block.group, fields } });
  }

  return next;
}

export function insertBlockAt(
  blocks: FieldBuilderBlock[],
  index: number,
  block: FieldBuilderBlock,
): FieldBuilderBlock[] {
  const next = [...blocks];
  next.splice(index, 0, block);
  return reorderBlockFields(next);
}

export function sanitizeBlocks(blocks: FieldBuilderBlock[]): FieldBuilderBlock[] {
  const next: FieldBuilderBlock[] = [];

  for (const block of blocks) {
    if (block.type === "field") {
      next.push(block);
      continue;
    }

    if (block.group.fields.length <= 1) {
      for (const field of block.group.fields) {
        next.push({ type: "field", field });
      }
      continue;
    }

    next.push(block);
  }

  return reorderBlockFields(next);
}

export function blocksToApiInput(blocks: FieldBuilderBlock[]) {
  return sanitizeBlocks(blocks).map((block) => {
    if (block.type === "field") {
      return {
        type: "field" as const,
        field: fieldBuilderToInput(block.field),
      };
    }

    return {
      type: "group" as const,
      group: {
        ...(block.group.id ? { id: block.group.id } : {}),
        label: block.group.label,
        fields: block.group.fields.map(fieldBuilderToInput),
      },
    };
  });
}
