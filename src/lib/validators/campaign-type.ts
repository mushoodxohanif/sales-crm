import { z } from "zod";
import { FieldType } from "@/generated/prisma/client";
import { cuidSchema, fieldKeySchema, slugSchema } from "./common";

export const fieldTypeSchema = z.nativeEnum(FieldType);

const selectFieldTypes = new Set<FieldType>([FieldType.SELECT, FieldType.MULTI_SELECT]);

function requiresOptions(fieldType: FieldType) {
  return selectFieldTypes.has(fieldType);
}

export const campaignTypeFieldSchema = z
  .object({
    id: cuidSchema.optional(),
    key: fieldKeySchema,
    label: z.string().min(1).max(120),
    fieldType: fieldTypeSchema,
    required: z.boolean().default(false),
    sortOrder: z.number().int().min(0).default(0),
    options: z.array(z.string().min(1)).optional(),
  })
  .superRefine((field, ctx) => {
    if (requiresOptions(field.fieldType) && (!field.options || field.options.length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Select fields require at least one option",
        path: ["options"],
      });
    }
  });

export const createCampaignTypeSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema,
  description: z.string().max(500).optional(),
  fields: z.array(campaignTypeFieldSchema).default([]),
});

export const updateCampaignTypeSchema = z.object({
  id: cuidSchema,
  name: z.string().min(1).max(120),
  slug: slugSchema,
  description: z.string().max(500).optional(),
});

export const deleteCampaignTypeSchema = z.object({
  id: cuidSchema,
});

export const upsertCampaignTypeFieldsSchema = z.object({
  campaignTypeId: cuidSchema,
  fields: z.array(campaignTypeFieldSchema),
});

export type CreateCampaignTypeInput = z.infer<typeof createCampaignTypeSchema>;
export type UpdateCampaignTypeInput = z.infer<typeof updateCampaignTypeSchema>;
export type CampaignTypeFieldInput = z.infer<typeof campaignTypeFieldSchema>;
export type UpsertCampaignTypeFieldsInput = z.infer<typeof upsertCampaignTypeFieldsSchema>;
