import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const google = createGoogleGenerativeAI({ apiKey });
  return google("gemini-3.5-flash");
}
