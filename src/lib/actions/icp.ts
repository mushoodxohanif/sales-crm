"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { evaluateLeadIcp as runIcpEvaluation } from "@/lib/ai/icp-evaluation";
import {
  getLatestLeadIcpEvaluation,
  getWorkspaceIcpProfile,
  type WorkspaceIcpProfileData,
} from "@/lib/data/icp";
import { db } from "@/lib/db";
import { DEFAULT_ICP_PROFILE_ID } from "@/lib/icp/defaults";
import {
  type LeadIcpEvaluationClient,
  toLeadIcpEvaluationClientFromRecord,
} from "@/lib/icp/serialization";
import {
  fieldValuesToMap,
  formatFieldValueForDisplay,
  toFieldDefinitions,
} from "@/lib/leads/field-values";
import {
  clearLeadIcpEvaluationSchema,
  evaluateLeadIcpSchema,
  updateIcpProfileSchema,
} from "@/lib/validators/icp";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input.";
}

function revalidateIcpPaths() {
  revalidatePath("/settings/icp");
}

function revalidateLeadIcpPaths(campaignId: string, leadId: string) {
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/leads/${leadId}`);
}

function buildLeadContextForIcp(
  fields: ReturnType<typeof toFieldDefinitions>,
  fieldValues: Array<{ fieldId: string; value: unknown }>,
): Record<string, string> {
  const valueMap = fieldValuesToMap(fieldValues);
  const context: Record<string, string> = {};

  for (const field of fields) {
    const value = valueMap[field.id];

    if (value === null || value === undefined || value === "") {
      continue;
    }

    context[field.label] = formatFieldValueForDisplay(value);
  }

  return context;
}

export type IcpProfile = WorkspaceIcpProfileData;

export async function getIcpProfile(): Promise<ActionResult<IcpProfile>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const profile = await getWorkspaceIcpProfile();
  return actionSuccess(profile);
}

export async function getLeadIcpEvaluation(
  leadId: string,
): Promise<ActionResult<LeadIcpEvaluationClient | null>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  if (!leadId.trim()) {
    return actionError("Lead id is required.");
  }

  const evaluation = await getLatestLeadIcpEvaluation(leadId);
  return actionSuccess(evaluation ? toLeadIcpEvaluationClientFromRecord(evaluation) : null);
}

export async function evaluateLeadIcp(
  input: unknown,
): Promise<ActionResult<LeadIcpEvaluationClient>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  if (!isGeminiConfigured()) {
    return actionError("GEMINI_API_KEY is not configured. Add it to enable ICP evaluation.");
  }

  const parsed = evaluateLeadIcpSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const lead = await db.lead.findUnique({
    where: { id: parsed.data.leadId },
    include: {
      fieldValues: true,
      campaign: {
        select: {
          id: true,
          status: true,
          campaignType: {
            include: {
              fields: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!lead) {
    return actionError("Lead not found.");
  }

  if (lead.campaign.status === "ARCHIVED") {
    return actionError("Cannot evaluate ICP for leads in an archived campaign.");
  }

  const fields = toFieldDefinitions(lead.campaign.campaignType.fields);
  const leadContext = buildLeadContextForIcp(fields, lead.fieldValues);
  const profile = await getWorkspaceIcpProfile();
  const instructions = parsed.data.instructions?.trim();

  try {
    const result = await runIcpEvaluation({
      profile,
      leadContext,
      instructions,
    });

    const inputContext = {
      leadContext,
      instructions: instructions ?? null,
      profileId: profile.id,
    };

    const saved = await db.leadIcpEvaluation.create({
      data: {
        leadId: lead.id,
        userId,
        score: result.score,
        verdict: result.verdict,
        decision: result.decision,
        industry: result.industry,
        reasoning: result.reasoning,
        painPoints: result.painPoints,
        automationUseCases: result.automationUseCases,
        inputContext,
      },
    });

    revalidateLeadIcpPaths(lead.campaign.id, lead.id);

    return actionSuccess(toLeadIcpEvaluationClientFromRecord(saved));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to evaluate ICP.";
    return actionError(message);
  }
}

export async function clearLeadIcpEvaluation(input: unknown): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = clearLeadIcpEvaluationSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const lead = await db.lead.findUnique({
    where: { id: parsed.data.leadId },
    select: {
      id: true,
      campaign: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!lead) {
    return actionError("Lead not found.");
  }

  if (lead.campaign.status === "ARCHIVED") {
    return actionError("Cannot clear ICP evaluation for leads in an archived campaign.");
  }

  await db.leadIcpEvaluation.deleteMany({
    where: { leadId: lead.id },
  });

  revalidateLeadIcpPaths(lead.campaign.id, lead.id);

  return actionSuccess(null);
}

export async function updateIcpProfile(input: unknown): Promise<ActionResult<IcpProfile>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = updateIcpProfileSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  await db.workspaceIcpProfile.upsert({
    where: { id: DEFAULT_ICP_PROFILE_ID },
    update: {
      productDescription: parsed.data.productDescription,
      targetIndustries: parsed.data.targetIndustries,
      idealEmployeeMin: parsed.data.idealEmployeeMin,
      idealEmployeeMax: parsed.data.idealEmployeeMax,
      scoringGuidelines: parsed.data.scoringGuidelines,
      exclusionGuidelines: parsed.data.exclusionGuidelines,
      scoreThresholds: parsed.data.scoreThresholds,
    },
    create: {
      id: DEFAULT_ICP_PROFILE_ID,
      productDescription: parsed.data.productDescription,
      targetIndustries: parsed.data.targetIndustries,
      idealEmployeeMin: parsed.data.idealEmployeeMin,
      idealEmployeeMax: parsed.data.idealEmployeeMax,
      scoringGuidelines: parsed.data.scoringGuidelines,
      exclusionGuidelines: parsed.data.exclusionGuidelines,
      scoreThresholds: parsed.data.scoreThresholds,
    },
  });

  revalidateIcpPaths();
  return actionSuccess(await getWorkspaceIcpProfile());
}
