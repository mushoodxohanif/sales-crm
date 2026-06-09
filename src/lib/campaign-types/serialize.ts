import type { CampaignTypeField } from "@/generated/prisma/client";
import type { FieldBuilderValue, FieldTypeValue } from "@/lib/campaign-types/fields";

export function campaignTypeFieldsToBuilderValues(
  fields: CampaignTypeField[],
): FieldBuilderValue[] {
  return fields.map((field) => ({
    clientId: field.id,
    id: field.id,
    key: field.key,
    label: field.label,
    fieldType: field.fieldType as FieldTypeValue,
    required: field.required,
    sortOrder: field.sortOrder,
    options: Array.isArray(field.options)
      ? field.options.filter((option): option is string => typeof option === "string")
      : [],
  }));
}
