import { z } from "zod";

export const icpScoreThresholdsSchema = z
  .object({
    gold: z.number().min(0).max(10),
    strong: z.number().min(0).max(10),
    mixed: z.number().min(0).max(10),
  })
  .refine((thresholds) => thresholds.gold > thresholds.strong, {
    message: "Gold threshold must be higher than strong",
    path: ["gold"],
  })
  .refine((thresholds) => thresholds.strong > thresholds.mixed, {
    message: "Strong threshold must be higher than mixed",
    path: ["strong"],
  });

export const updateIcpProfileSchema = z
  .object({
    productDescription: z
      .string()
      .trim()
      .min(1, "Product description is required")
      .max(5000, "Product description is too long"),
    targetIndustries: z
      .array(z.string().trim().min(1, "Industry names cannot be empty"))
      .min(1, "Add at least one target industry"),
    idealEmployeeMin: z.number().int().min(1, "Minimum employees must be at least 1"),
    idealEmployeeMax: z.number().int().min(1, "Maximum employees must be at least 1"),
    scoringGuidelines: z
      .string()
      .trim()
      .min(1, "Scoring guidelines are required")
      .max(10000, "Scoring guidelines are too long"),
    exclusionGuidelines: z
      .string()
      .trim()
      .min(1, "Exclusion guidelines are required")
      .max(10000, "Exclusion guidelines are too long"),
    scoreThresholds: icpScoreThresholdsSchema,
  })
  .refine((data) => data.idealEmployeeMax >= data.idealEmployeeMin, {
    message: "Maximum employees must be at least the minimum",
    path: ["idealEmployeeMax"],
  });

export type UpdateIcpProfileInput = z.infer<typeof updateIcpProfileSchema>;

export const evaluateLeadIcpSchema = z.object({
  leadId: z.string().min(1, "Lead id is required"),
  additionalContext: z.string().max(10000, "Additional context is too long").optional(),
});

export type EvaluateLeadIcpInput = z.infer<typeof evaluateLeadIcpSchema>;
