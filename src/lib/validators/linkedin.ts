import { z } from "zod";

export const generateWarmupCommentSchema = z.object({
  postText: z.string().trim().min(1, "Post text is required").max(10000, "Post text is too long"),
  leadId: z.string().cuid().optional(),
});

export const saveCommentToLeadSchema = z.object({
  leadId: z.string().cuid(),
  comment: z.string().trim().min(1, "Comment is required").max(10000, "Comment is too long"),
});

export type GenerateWarmupCommentInput = z.infer<typeof generateWarmupCommentSchema>;
export type SaveCommentToLeadInput = z.infer<typeof saveCommentToLeadSchema>;
