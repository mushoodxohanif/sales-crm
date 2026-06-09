import { z } from "zod";
import { CampaignStatus } from "@/generated/prisma/client";
import { slugSchema } from "./common";

export const campaignStageSeedSchema = z.object({
  name: z.string().min(1).max(80),
  slug: slugSchema,
  sortOrder: z.number().int().min(0),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex value like #3B82F6")
    .optional(),
  isDefault: z.boolean(),
});

export const campaignStatusSchema = z.nativeEnum(CampaignStatus);

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  campaignTypeId: z.string().cuid(),
  stages: z.array(campaignStageSeedSchema).min(1).optional(),
});

export const updateCampaignSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(120).optional(),
  status: campaignStatusSchema.optional(),
});

export const archiveCampaignSchema = z.object({
  id: z.string().cuid(),
});

export const saveCampaignSettingsStageSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1).max(80),
  slug: slugSchema,
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex value like #3B82F6")
    .nullable()
    .optional(),
  isDefault: z.boolean(),
});

export const saveCampaignSettingsSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(120),
  stages: z.array(saveCampaignSettingsStageSchema).min(1),
  deletedStageIds: z.array(z.string().cuid()).default([]),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type SaveCampaignSettingsInput = z.infer<typeof saveCampaignSettingsSchema>;
