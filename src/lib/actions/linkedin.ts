"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { CampaignStatus } from "@/generated/prisma/client";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { generateWarmupComment as runGenerateWarmupComment } from "@/lib/ai/linkedin-comment";
import { db } from "@/lib/db";
import {
  fieldValuesToMap,
  formatFieldValueForDisplay,
  mapToFieldValues,
  toFieldDefinitions,
} from "@/lib/leads/field-values";
import { generateWarmupCommentSchema, saveCommentToLeadSchema } from "@/lib/validators/linkedin";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input.";
}

function buildLeadContext(
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

async function getLeadForLinkedInContext(leadId: string) {
  return db.lead.findUnique({
    where: { id: leadId },
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
}

export async function generateWarmupComment(
  input: unknown,
): Promise<ActionResult<{ comment: string }>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  if (!isGeminiConfigured()) {
    return actionError(
      "GEMINI_API_KEY is not configured. Add it to enable LinkedIn comment generation.",
    );
  }

  const parsed = generateWarmupCommentSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  let leadContext: Record<string, string> | undefined;

  if (parsed.data.leadId) {
    const lead = await getLeadForLinkedInContext(parsed.data.leadId);

    if (!lead) {
      return actionError("Lead not found.");
    }

    if (lead.campaign.status === CampaignStatus.ARCHIVED) {
      return actionError("Cannot generate comments for leads in an archived campaign.");
    }

    const fields = toFieldDefinitions(lead.campaign.campaignType.fields);
    leadContext = buildLeadContext(fields, lead.fieldValues);
  }

  try {
    const comment = await runGenerateWarmupComment({
      postText: parsed.data.postText,
      leadContext,
    });

    return actionSuccess({ comment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate comment.";
    return actionError(message);
  }
}

export async function saveCommentToLead(input: unknown): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = saveCommentToLeadSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const lead = await getLeadForLinkedInContext(parsed.data.leadId);

  if (!lead) {
    return actionError("Lead not found.");
  }

  if (lead.campaign.status === CampaignStatus.ARCHIVED) {
    return actionError("Cannot save comments to leads in an archived campaign.");
  }

  const fields = toFieldDefinitions(lead.campaign.campaignType.fields);
  const connectionNoteField = fields.find((field) => field.key === "connection_note");

  if (!connectionNoteField) {
    return actionError("This lead's campaign type does not have a Connection Note field.");
  }

  const valueMap = fieldValuesToMap(lead.fieldValues);
  valueMap[connectionNoteField.id] = parsed.data.comment;

  const { updateLead } = await import("@/lib/actions/leads");

  const result = await updateLead({
    id: lead.id,
    fieldValues: mapToFieldValues(fields, valueMap),
  });

  if (!result.success) {
    return actionError(result.error);
  }

  revalidatePath("/tools/linkedin-comment");
  revalidatePath(`/campaigns/${lead.campaign.id}`);
  revalidatePath(`/campaigns/${lead.campaign.id}/leads/${lead.id}`);

  return actionSuccess({ id: lead.id });
}
