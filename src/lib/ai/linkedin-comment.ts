import { generateText } from "ai";
import { getGeminiModel } from "@/lib/ai/gemini";

export type GenerateWarmupCommentInput = {
  postText: string;
  leadContext?: Record<string, string>;
};

function formatLeadContext(leadContext: Record<string, string>): string {
  const entries = Object.entries(leadContext).filter(([, value]) => value.trim().length > 0);

  if (entries.length === 0) {
    return "";
  }

  return `\n\nLead context (use for industry/role awareness, do not mention explicitly):\n${entries
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}`;
}

function buildWarmupCommentPrompt(input: GenerateWarmupCommentInput): string {
  return `You are a senior B2B operator writing LinkedIn engagement comments for logistics, SaaS, and operations-heavy industries.

Your task is to write a short "warmup comment" for the post below.

Rules:
- Tone: calm, executive, slightly analytical (NOT hype, NOT salesy, NOT emotional)
- Style: 2–4 sentences max
- Focus: execution, systems, reliability, scale under pressure, or operational insight
- Avoid emojis, exaggeration, and generic praise
- End with 1 thoughtful question OR forward-looking observation (optional, not forced)
- Sound like a CEO to CEO conversation, not a marketer
- Make it sound like a high-trust industry peer responding, not a follower
- Return ONLY the comment text, no labels or preamble

Post:
${input.postText.trim()}${formatLeadContext(input.leadContext ?? {})}`;
}

export async function generateWarmupComment(input: GenerateWarmupCommentInput): Promise<string> {
  const { text } = await generateText({
    model: getGeminiModel(),
    prompt: buildWarmupCommentPrompt(input),
  });

  return text.trim();
}
