import { z } from "zod";
import { CampaignStatus } from "@/generated/prisma/client";

export const campaignStatusSchema = z.nativeEnum(CampaignStatus);

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  campaignTypeId: z.string().cuid(),
});

export const updateCampaignSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(120).optional(),
  status: campaignStatusSchema.optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
