import { z } from "zod";

export const dailyTargetItemSchema = z.object({
  leadStageId: z.string().cuid(),
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  targetCount: z.number().int().min(1, "Target must be at least 1"),
});

export const saveDailyTargetsSchema = z.object({
  targets: z.array(dailyTargetItemSchema),
});

export const deleteDailyTargetSchema = z.object({
  id: z.string().cuid(),
});

export type DailyTargetItemInput = z.infer<typeof dailyTargetItemSchema>;
export type SaveDailyTargetsInput = z.infer<typeof saveDailyTargetsSchema>;
