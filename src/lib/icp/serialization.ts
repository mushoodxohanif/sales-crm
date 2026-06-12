import type { IcpDecision, IcpVerdict } from "@/generated/prisma/client";
import type { LeadIcpEvaluationData } from "@/lib/data/icp";

export type LeadIcpEvaluationClient = {
  id: string;
  score: number;
  verdict: IcpVerdict;
  decision: IcpDecision;
  industry: string;
  reasoning: string[];
  painPoints: string[];
  automationUseCases: string[];
  createdAt: string;
};

export function toLeadIcpEvaluationClient(
  evaluation: LeadIcpEvaluationData,
): LeadIcpEvaluationClient {
  return {
    id: evaluation.id,
    score: evaluation.score,
    verdict: evaluation.verdict,
    decision: evaluation.decision,
    industry: evaluation.industry,
    reasoning: evaluation.reasoning,
    painPoints: evaluation.painPoints,
    automationUseCases: evaluation.automationUseCases,
    createdAt: evaluation.createdAt.toISOString(),
  };
}

export function toLeadIcpEvaluationClientFromRecord(evaluation: {
  id: string;
  score: number;
  verdict: IcpVerdict;
  decision: IcpDecision;
  industry: string;
  reasoning: string[];
  painPoints: string[];
  automationUseCases: string[];
  createdAt: Date;
}): LeadIcpEvaluationClient {
  return {
    id: evaluation.id,
    score: evaluation.score,
    verdict: evaluation.verdict,
    decision: evaluation.decision,
    industry: evaluation.industry,
    reasoning: evaluation.reasoning,
    painPoints: evaluation.painPoints,
    automationUseCases: evaluation.automationUseCases,
    createdAt: evaluation.createdAt.toISOString(),
  };
}
