import { z } from "zod";
import { FieldType } from "@/generated/prisma/client";
import { slugSchema } from "./common";

export const fieldTypeSchema = z.nativeEnum(FieldType);

export const campaignTypeFieldSchema = z.object({
  key: slugSchema,
  label: z.string().min(1).max(120),
  fieldType: fieldTypeSchema,
  required: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  options: z.array(z.string().min(1)).optional(),
});

export const createCampaignTypeSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema,
  description: z.string().max(500).optional(),
  fields: z.array(campaignTypeFieldSchema).default([]),
});

export const updateCampaignTypeSchema = createCampaignTypeSchema.partial().extend({
  id: z.string().cuid(),
});

export type CreateCampaignTypeInput = z.infer<typeof createCampaignTypeSchema>;
export type UpdateCampaignTypeInput = z.infer<typeof updateCampaignTypeSchema>;
export type CampaignTypeFieldInput = z.infer<typeof campaignTypeFieldSchema>;
