import { generateObject } from "ai";
import { z } from "zod";
import { getGeminiModel } from "@/lib/ai/gemini";

export const icpVerdictSchema = z.enum(["STRONG", "MIXED", "NOT_ICP"]);
export const icpDecisionSchema = z.enum(["TARGET", "MAYBE", "REJECT"]);

export const icpEvaluationOutputSchema = z.object({
  companyName: z.string().min(1),
  industry: z.string().min(1),
  verdict: icpVerdictSchema,
  score: z.number().min(0).max(10),
  reasoning: z.array(z.string().min(1)).min(1),
  painPoints: z.array(z.string().min(1)),
  automationUseCases: z.array(z.string().min(1)),
  decision: icpDecisionSchema,
});

export type IcpEvaluationOutput = z.infer<typeof icpEvaluationOutputSchema>;

export type IcpProfileForEvaluation = {
  productDescription: string;
  targetIndustries: unknown;
  idealEmployeeMin: number;
  idealEmployeeMax: number;
  scoringGuidelines: string;
  exclusionGuidelines: string;
  scoreThresholds: unknown;
};

export type EvaluateLeadIcpInput = {
  profile: IcpProfileForEvaluation;
  leadContext: Record<string, string>;
  instructions?: string;
};

function formatTargetIndustries(targetIndustries: unknown): string {
  if (Array.isArray(targetIndustries)) {
    return targetIndustries.map(String).join(", ");
  }

  return String(targetIndustries ?? "");
}

function formatScoreThresholds(scoreThresholds: unknown): string {
  if (scoreThresholds && typeof scoreThresholds === "object" && !Array.isArray(scoreThresholds)) {
    const thresholds = scoreThresholds as Record<string, unknown>;
    const parts = ["gold", "strong", "mixed"]
      .filter((key) => thresholds[key] !== undefined)
      .map((key) => `${key}: ${thresholds[key]}+`);

    if (parts.length > 0) {
      return parts.join(", ");
    }
  }

  return "gold: 9+, strong: 7.5+, mixed: 6+";
}

function formatLeadContext(leadContext: Record<string, string>): string {
  const entries = Object.entries(leadContext).filter(([, value]) => value.trim().length > 0);

  if (entries.length === 0) {
    return "No structured lead fields provided.";
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join("\n");
}

function buildIcpEvaluationPrompt(input: EvaluateLeadIcpInput): string {
  const { profile, leadContext, instructions } = input;
  const instructionsBlock = instructions?.trim()
    ? `\nUser-provided evaluation instructions:\n${instructions.trim()}\n`
    : "";

  return `Act as an ICP validation engine for ${profile.productDescription}

Your job is to evaluate whether a company is a strong Ideal Customer Profile (ICP) fit.

Target industries: ${formatTargetIndustries(profile.targetIndustries)}
Ideal employee size: ${profile.idealEmployeeMin}–${profile.idealEmployeeMax} employees
Score thresholds: ${formatScoreThresholds(profile.scoreThresholds)}

Evaluation rules:
${profile.scoringGuidelines}

Exclusion rules:
${profile.exclusionGuidelines}

Output requirements:
- verdict: STRONG (score aligns with strong/gold thresholds), MIXED (secondary fit), or NOT_ICP (below mixed threshold)
- decision: TARGET for strong fits, MAYBE for mixed fits, REJECT for not ICP
- reasoning: clear, practical bullet points explaining the score
- painPoints: 3–6 operational issues relevant to automation (empty array if NOT_ICP)
- automationUseCases: matching AI solutions (empty array if NOT_ICP)

Be strict, not optimistic. Do not treat industry keywords alone as ICP proof.
${instructionsBlock}
Company to evaluate:
${formatLeadContext(leadContext)}`;
}

export async function evaluateLeadIcp(input: EvaluateLeadIcpInput): Promise<IcpEvaluationOutput> {
  const { object } = await generateObject({
    model: getGeminiModel(),
    schema: icpEvaluationOutputSchema,
    prompt: buildIcpEvaluationPrompt(input),
  });

  return object;
}
