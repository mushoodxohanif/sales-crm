import type { IcpDecision, IcpVerdict } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  DEFAULT_ICP_PROFILE,
  DEFAULT_ICP_PROFILE_ID,
  type IcpScoreThresholds,
} from "@/lib/icp/defaults";

export type LeadIcpEvaluationData = {
  id: string;
  leadId: string;
  score: number;
  verdict: IcpVerdict;
  decision: IcpDecision;
  industry: string;
  reasoning: string[];
  painPoints: string[];
  automationUseCases: string[];
  createdAt: Date;
};

export type WorkspaceIcpProfileData = {
  id: string;
  productDescription: string;
  targetIndustries: string[];
  idealEmployeeMin: number;
  idealEmployeeMax: number;
  scoringGuidelines: string;
  exclusionGuidelines: string;
  scoreThresholds: IcpScoreThresholds;
  updatedAt: Date | null;
};

function parseTargetIndustries(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter((item) => item.trim().length > 0);
  }

  return [...DEFAULT_ICP_PROFILE.targetIndustries];
}

function parseScoreThresholds(value: unknown): IcpScoreThresholds {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const thresholds = value as Record<string, unknown>;

    return {
      gold:
        typeof thresholds.gold === "number"
          ? thresholds.gold
          : DEFAULT_ICP_PROFILE.scoreThresholds.gold,
      strong:
        typeof thresholds.strong === "number"
          ? thresholds.strong
          : DEFAULT_ICP_PROFILE.scoreThresholds.strong,
      mixed:
        typeof thresholds.mixed === "number"
          ? thresholds.mixed
          : DEFAULT_ICP_PROFILE.scoreThresholds.mixed,
    };
  }

  return { ...DEFAULT_ICP_PROFILE.scoreThresholds };
}

function toWorkspaceIcpProfileData(
  profile: {
    id: string;
    productDescription: string;
    targetIndustries: unknown;
    idealEmployeeMin: number;
    idealEmployeeMax: number;
    scoringGuidelines: string;
    exclusionGuidelines: string;
    scoreThresholds: unknown;
    updatedAt: Date;
  } | null,
): WorkspaceIcpProfileData {
  if (!profile) {
    return {
      id: DEFAULT_ICP_PROFILE_ID,
      productDescription: DEFAULT_ICP_PROFILE.productDescription,
      targetIndustries: [...DEFAULT_ICP_PROFILE.targetIndustries],
      idealEmployeeMin: DEFAULT_ICP_PROFILE.idealEmployeeMin,
      idealEmployeeMax: DEFAULT_ICP_PROFILE.idealEmployeeMax,
      scoringGuidelines: DEFAULT_ICP_PROFILE.scoringGuidelines,
      exclusionGuidelines: DEFAULT_ICP_PROFILE.exclusionGuidelines,
      scoreThresholds: { ...DEFAULT_ICP_PROFILE.scoreThresholds },
      updatedAt: null,
    };
  }

  return {
    id: profile.id,
    productDescription: profile.productDescription,
    targetIndustries: parseTargetIndustries(profile.targetIndustries),
    idealEmployeeMin: profile.idealEmployeeMin,
    idealEmployeeMax: profile.idealEmployeeMax,
    scoringGuidelines: profile.scoringGuidelines,
    exclusionGuidelines: profile.exclusionGuidelines,
    scoreThresholds: parseScoreThresholds(profile.scoreThresholds),
    updatedAt: profile.updatedAt,
  };
}

export async function getWorkspaceIcpProfile(): Promise<WorkspaceIcpProfileData> {
  const profile = await db.workspaceIcpProfile.findUnique({
    where: { id: DEFAULT_ICP_PROFILE_ID },
  });

  return toWorkspaceIcpProfileData(profile);
}

function toLeadIcpEvaluationData(evaluation: {
  id: string;
  leadId: string;
  score: number;
  verdict: IcpVerdict;
  decision: IcpDecision;
  industry: string;
  reasoning: string[];
  painPoints: string[];
  automationUseCases: string[];
  createdAt: Date;
}): LeadIcpEvaluationData {
  return {
    id: evaluation.id,
    leadId: evaluation.leadId,
    score: evaluation.score,
    verdict: evaluation.verdict,
    decision: evaluation.decision,
    industry: evaluation.industry,
    reasoning: evaluation.reasoning,
    painPoints: evaluation.painPoints,
    automationUseCases: evaluation.automationUseCases,
    createdAt: evaluation.createdAt,
  };
}

export async function getLatestLeadIcpEvaluation(
  leadId: string,
): Promise<LeadIcpEvaluationData | null> {
  const evaluation = await db.leadIcpEvaluation.findFirst({
    where: { leadId },
    orderBy: { createdAt: "desc" },
  });

  return evaluation ? toLeadIcpEvaluationData(evaluation) : null;
}
