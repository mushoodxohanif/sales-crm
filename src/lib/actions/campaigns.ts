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
  saveCampaignSettingsSchema,
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

export async function saveCampaignSettings(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = saveCampaignSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { id, name, stages, deletedStageIds } = parsed.data;

  const campaign = await db.campaign.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      stages: {
        select: { id: true },
      },
    },
  });

  if (!campaign) {
    return actionError("Campaign not found.");
  }

  if (campaign.status === CampaignStatus.ARCHIVED) {
    return actionError("Archived campaigns cannot be edited.");
  }

  const existingStageIds = new Set(campaign.stages.map((stage) => stage.id));
  const submittedExistingIds = stages
    .map((stage) => stage.id)
    .filter((stageId): stageId is string => stageId !== undefined);

  if (!submittedExistingIds.every((stageId) => existingStageIds.has(stageId))) {
    return actionError("One or more stages do not belong to this campaign.");
  }

  if (!deletedStageIds.every((stageId) => existingStageIds.has(stageId))) {
    return actionError("One or more deleted stages do not belong to this campaign.");
  }

  const deletedIdSet = new Set(deletedStageIds);
  const retainedExistingIds = new Set(submittedExistingIds);

  if (retainedExistingIds.size + deletedIdSet.size !== existingStageIds.size) {
    return actionError("Stage list is out of sync. Refresh and try again.");
  }

  for (const stageId of deletedIdSet) {
    if (retainedExistingIds.has(stageId)) {
      return actionError("A deleted stage is still present in the pipeline.");
    }
  }

  const defaultCount = stages.filter((stage) => stage.isDefault).length;
  if (defaultCount !== 1) {
    return actionError("Exactly one pipeline stage must be marked as default.");
  }

  const slugs = stages.map((stage) => stage.slug);
  if (new Set(slugs).size !== slugs.length) {
    return actionError("Each stage must have a unique slug.");
  }

  const stagesWithLeads = await db.leadStage.findMany({
    where: {
      id: { in: deletedStageIds },
      leads: { some: {} },
    },
    select: { id: true },
  });

  if (stagesWithLeads.length > 0) {
    return actionError(
      "Cannot delete a stage that still has leads. Move leads to another stage first.",
    );
  }

  if (stages.length - deletedStageIds.length < 1) {
    return actionError("A campaign must have at least one pipeline stage.");
  }

  await db.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id },
      data: { name },
    });

    if (deletedStageIds.length > 0) {
      await tx.leadStage.deleteMany({
        where: {
          campaignId: id,
          id: { in: deletedStageIds },
        },
      });
    }

    await tx.leadStage.updateMany({
      where: { campaignId: id },
      data: { isDefault: false },
    });

    for (const [index, stage] of stages.entries()) {
      if (stage.id) {
        await tx.leadStage.update({
          where: { id: stage.id },
          data: {
            name: stage.name,
            slug: stage.slug,
            sortOrder: index,
            color: stage.color ?? null,
            isDefault: stage.isDefault,
          },
        });
        continue;
      }

      await tx.leadStage.create({
        data: {
          campaignId: id,
          name: stage.name,
          slug: stage.slug,
          sortOrder: index,
          color: stage.color ?? null,
          isDefault: stage.isDefault,
        },
      });
    }
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
