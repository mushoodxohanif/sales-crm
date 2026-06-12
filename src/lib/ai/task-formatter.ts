import { generateObject } from "ai";
import { z } from "zod";
import { getGeminiModel } from "@/lib/ai/gemini";

export const taskFormatterOutputSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
});

export type TaskFormatterOutput = z.infer<typeof taskFormatterOutputSchema>;

export type FormatTaskFromRawInputInput = {
  rawInput: string;
  leadContext?: Record<string, string>;
};

function formatLeadContext(leadContext: Record<string, string>): string {
  const entries = Object.entries(leadContext).filter(([, value]) => value.trim().length > 0);

  if (entries.length === 0) {
    return "";
  }

  return `\n\nRelated lead context:\n${entries.map(([key, value]) => `${key}: ${value}`).join("\n")}`;
}

function buildTaskFormatterPrompt(input: FormatTaskFromRawInputInput): string {
  return `Act as a task assistant for a sales CRM. Convert the raw activity input into a concise task.

Rules:
- title: short, professional headline (2–8 words)
- description: humanized, simple description (1–2 lines)
- Keep it concise and natural (no robotic tone)
- Focus on clarity and execution
- Improve wording for professionalism and readability when needed
- Do not add emojis

Raw activity:
${input.rawInput.trim()}${formatLeadContext(input.leadContext ?? {})}`;
}

export async function formatTaskFromRawInput(
  input: FormatTaskFromRawInputInput,
): Promise<TaskFormatterOutput> {
  const { object } = await generateObject({
    model: getGeminiModel(),
    schema: taskFormatterOutputSchema,
    prompt: buildTaskFormatterPrompt(input),
  });

  return object;
}
