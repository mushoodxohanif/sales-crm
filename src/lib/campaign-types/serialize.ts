import type { CampaignTypeField, CampaignTypeFieldGroup } from "@/generated/prisma/client";
import type {
  FieldBuilderBlock,
  FieldBuilderValue,
  FieldTypeValue,
} from "@/lib/campaign-types/fields";

function fieldToBuilderValue(field: CampaignTypeField): FieldBuilderValue {
  return {
    clientId: field.id,
    id: field.id,
    key: field.key,
    label: field.label,
    fieldType: field.fieldType as FieldTypeValue,
    required: field.required,
    showOnKanbanCard: field.showOnKanbanCard,
    isUnique: field.isUnique,
    sortOrder: field.sortOrder,
    options: Array.isArray(field.options)
      ? field.options.filter((option): option is string => typeof option === "string")
      : [],
  };
}

export function campaignTypeFieldsToBuilderBlocks(
  fields: CampaignTypeField[],
  groups: CampaignTypeFieldGroup[] = [],
): FieldBuilderBlock[] {
  const sortedFields = [...fields].sort((left, right) => left.sortOrder - right.sortOrder);
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const blocks: FieldBuilderBlock[] = [];
  const renderedGroupIds = new Set<string>();

  for (const field of sortedFields) {
    if (!field.groupId) {
      blocks.push({ type: "field", field: fieldToBuilderValue(field) });
      continue;
    }

    if (renderedGroupIds.has(field.groupId)) {
      continue;
    }

    const group = groupById.get(field.groupId);
    if (!group) {
      blocks.push({ type: "field", field: fieldToBuilderValue(field) });
      continue;
    }

    const groupFields = sortedFields
      .filter((item) => item.groupId === field.groupId)
      .map(fieldToBuilderValue);

    if (groupFields.length === 1) {
      blocks.push({ type: "field", field: groupFields[0] });
      continue;
    }

    renderedGroupIds.add(field.groupId);
    blocks.push({
      type: "group",
      group: {
        clientId: group.id,
        id: group.id,
        label: group.label,
        fields: groupFields,
      },
    });
  }

  return blocks;
}

export function campaignTypeFieldsToBuilderValues(
  fields: CampaignTypeField[],
): FieldBuilderValue[] {
  return fields.map(fieldToBuilderValue);
}
