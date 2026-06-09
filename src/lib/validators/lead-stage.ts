import { z } from "zod";
import { slugSchema } from "./common";

export const createLeadStageSchema = z.object({
  campaignId: z.string().cuid(),
  name: z.string().min(1).max(80),
  slug: slugSchema,
  sortOrder: z.number().int().min(0).default(0),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex value like #3B82F6")
    .optional(),
  isDefault: z.boolean().default(false),
});

export const updateLeadStageSchema = createLeadStageSchema.partial().extend({
  id: z.string().cuid(),
});

export const reorderLeadStagesSchema = z.object({
  campaignId: z.string().cuid(),
  stageIds: z.array(z.string().cuid()).min(1),
});

export type CreateLeadStageInput = z.infer<typeof createLeadStageSchema>;
export type UpdateLeadStageInput = z.infer<typeof updateLeadStageSchema>;
