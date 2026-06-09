import { z } from "zod";

export const leadFieldValueSchema = z.object({
  fieldId: z.string().cuid(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
});

export const createLeadSchema = z.object({
  campaignId: z.string().cuid(),
  currentStageId: z.string().cuid().optional(),
  fieldValues: z.array(leadFieldValueSchema),
});

export const updateLeadSchema = z.object({
  id: z.string().cuid(),
  currentStageId: z.string().cuid().optional(),
  fieldValues: z.array(leadFieldValueSchema).optional(),
});

export const moveLeadToStageSchema = z.object({
  leadId: z.string().cuid(),
  stageId: z.string().cuid(),
});

export const deleteLeadSchema = z.object({
  id: z.string().cuid(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadFieldValueInput = z.infer<typeof leadFieldValueSchema>;
