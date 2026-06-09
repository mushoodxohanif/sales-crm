"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { CampaignStatus } from "@/generated/prisma/client";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import { DEFAULT_STAGES } from "@/lib/campaigns/default-stages";
import { db } from "@/lib/db";
import {
  archiveCampaignSchema,
  createCampaignSchema,
  updateCampaignSchema,
} from "@/lib/validators/campaign";

async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    return actionError("You must be signed in to perform this action.");
  }

  return null;
}

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input.";
}

function revalidateCampaignPaths(campaignId: string) {
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
}

export async function createCampaign(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = createCampaignSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { name, campaignTypeId, stages } = parsed.data;

  const campaignType = await db.campaignType.findUnique({
    where: { id: campaignTypeId },
    select: { id: true },
  });

  if (!campaignType) {
    return actionError("Campaign type not found.");
  }

  const stageData =
    stages ??
    DEFAULT_STAGES.map((stage) => ({
      name: stage.name,
      slug: stage.slug,
      sortOrder: stage.sortOrder,
      color: stage.color,
      isDefault: stage.isDefault,
    }));

  const defaultCount = stageData.filter((stage) => stage.isDefault).length;
  if (defaultCount !== 1) {
    return actionError("Exactly one pipeline stage must be marked as default.");
  }

  const campaign = await db.campaign.create({
    data: {
      name,
      campaignTypeId,
      stages: {
        create: stageData,
      },
    },
    select: { id: true },
  });

  revalidatePath("/campaigns");
  revalidatePath("/dashboard");

  return actionSuccess({ id: campaign.id });
}

export async function updateCampaign(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = updateCampaignSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { id, name, status } = parsed.data;

  const existing = await db.campaign.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return actionError("Campaign not found.");
  }

  await db.campaign.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  });

  revalidateCampaignPaths(id);

  return actionSuccess({ id });
}

export async function archiveCampaign(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = archiveCampaignSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { id } = parsed.data;

  const existing = await db.campaign.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return actionError("Campaign not found.");
  }

  if (existing.status === CampaignStatus.ARCHIVED) {
    return actionError("Campaign is already archived.");
  }

  await db.campaign.update({
    where: { id },
    data: { status: CampaignStatus.ARCHIVED },
  });

  revalidateCampaignPaths(id);

  return actionSuccess({ id });
}

export async function restoreCampaign(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = archiveCampaignSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { id } = parsed.data;

  const existing = await db.campaign.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return actionError("Campaign not found.");
  }

  if (existing.status === CampaignStatus.ACTIVE) {
    return actionError("Campaign is already active.");
  }

  await db.campaign.update({
    where: { id },
    data: { status: CampaignStatus.ACTIVE },
  });

  revalidateCampaignPaths(id);

  return actionSuccess({ id });
}
