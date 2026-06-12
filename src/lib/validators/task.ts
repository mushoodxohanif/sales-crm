import { z } from "zod";

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title is too long"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(5000, "Description is too long"),
  leadId: z.string().cuid().optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().cuid(),
  title: z.string().trim().min(1, "Title is required").max(120, "Title is too long").optional(),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(5000, "Description is too long")
    .optional(),
  status: taskStatusSchema.optional(),
  leadId: z.string().cuid().nullable().optional(),
});

export const updateTaskStatusSchema = z.object({
  id: z.string().cuid(),
  status: taskStatusSchema,
});

export const deleteTaskSchema = z.object({
  id: z.string().cuid(),
});

export const createTaskFromAISchema = z.object({
  rawInput: z
    .string()
    .trim()
    .min(1, "Activity text is required")
    .max(5000, "Activity text is too long"),
  leadId: z.string().cuid().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;
export type CreateTaskFromAIInput = z.infer<typeof createTaskFromAISchema>;
