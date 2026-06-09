"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import { db } from "@/lib/db";
import {
  createLeadStageSchema,
  deleteLeadStageSchema,
  reorderLeadStagesSchema,
  updateLeadStageSchema,
} from "@/lib/validators/lead-stage";

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
}

async function unsetDefaultStages(campaignId: string, exceptStageId?: string) {
  await db.leadStage.updateMany({
    where: {
      campaignId,
      ...(exceptStageId ? { NOT: { id: exceptStageId } } : {}),
    },
    data: { isDefault: false },
  });
}

export async function createStage(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = createLeadStageSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { campaignId, name, slug, sortOrder, color, isDefault } = parsed.data;

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true },
  });

  if (!campaign) {
    return actionError("Campaign not found.");
  }

  const slugConflict = await db.leadStage.findUnique({
    where: {
      campaignId_slug: { campaignId, slug },
    },
    select: { id: true },
  });

  if (slugConflict) {
    return actionError("A stage with this slug already exists in this campaign.");
  }

  const stage = await db.$transaction(async (tx) => {
    if (isDefault) {
      await tx.leadStage.updateMany({
        where: { campaignId },
        data: { isDefault: false },
      });
    }

    return tx.leadStage.create({
      data: {
        campaignId,
        name,
        slug,
        sortOrder,
        color,
        isDefault,
      },
      select: { id: true },
    });
  });

  revalidateCampaignPaths(campaignId);

  return actionSuccess({ id: stage.id });
}

export async function updateStage(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = updateLeadStageSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { id, campaignId, name, slug, sortOrder, color, isDefault } = parsed.data;

  const stage = await db.leadStage.findUnique({
    where: { id },
    select: { id: true, campaignId: true },
  });

  if (!stage) {
    return actionError("Stage not found.");
  }

  if (campaignId && campaignId !== stage.campaignId) {
    return actionError("Stage does not belong to this campaign.");
  }

  if (slug) {
    const slugConflict = await db.leadStage.findFirst({
      where: {
        campaignId: stage.campaignId,
        slug,
        NOT: { id },
      },
      select: { id: true },
    });

    if (slugConflict) {
      return actionError("A stage with this slug already exists in this campaign.");
    }
  }

  await db.$transaction(async (tx) => {
    if (isDefault) {
      await tx.leadStage.updateMany({
        where: {
          campaignId: stage.campaignId,
          NOT: { id },
        },
        data: { isDefault: false },
      });
    }

    await tx.leadStage.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(isDefault !== undefined ? { isDefault } : {}),
      },
    });
  });

  revalidateCampaignPaths(stage.campaignId);

  return actionSuccess({ id });
}

export async function reorderStages(input: unknown): Promise<ActionResult<{ campaignId: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = reorderLeadStagesSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { campaignId, stageIds } = parsed.data;

  const stages = await db.leadStage.findMany({
    where: { campaignId },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });

  if (stages.length !== stageIds.length) {
    return actionError("Stage list is out of sync. Refresh and try again.");
  }

  const existingIds = new Set(stages.map((stage) => stage.id));
  if (!stageIds.every((stageId) => existingIds.has(stageId))) {
    return actionError("One or more stages do not belong to this campaign.");
  }

  await db.$transaction(
    stageIds.map((stageId, index) =>
      db.leadStage.update({
        where: { id: stageId },
        data: { sortOrder: index },
      }),
    ),
  );

  revalidateCampaignPaths(campaignId);

  return actionSuccess({ campaignId });
}

export async function deleteStage(input: unknown): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = deleteLeadStageSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { id } = parsed.data;

  const stage = await db.leadStage.findUnique({
    where: { id },
    include: {
      _count: {
        select: { leads: true },
      },
    },
  });

  if (!stage) {
    return actionError("Stage not found.");
  }

  if (stage._count.leads > 0) {
    return actionError(
      "Cannot delete a stage that still has leads. Move leads to another stage first.",
    );
  }

  const remainingStages = await db.leadStage.findMany({
    where: {
      campaignId: stage.campaignId,
      NOT: { id },
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  if (remainingStages.length === 0) {
    return actionError("Cannot delete the only stage in a campaign.");
  }

  await db.$transaction(async (tx) => {
    await tx.leadStage.delete({
      where: { id },
    });

    if (stage.isDefault) {
      await unsetDefaultStages(stage.campaignId);
      await tx.leadStage.update({
        where: { id: remainingStages[0].id },
        data: { isDefault: true },
      });
    }

    for (const [index, remainingStage] of remainingStages.entries()) {
      await tx.leadStage.update({
        where: { id: remainingStage.id },
        data: { sortOrder: index },
      });
    }
  });

  revalidateCampaignPaths(stage.campaignId);

  return actionSuccess(undefined);
}

export async function setDefaultStage(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = deleteLeadStageSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { id } = parsed.data;

  const stage = await db.leadStage.findUnique({
    where: { id },
    select: { id: true, campaignId: true },
  });

  if (!stage) {
    return actionError("Stage not found.");
  }

  await db.$transaction(async (tx) => {
    await tx.leadStage.updateMany({
      where: { campaignId: stage.campaignId },
      data: { isDefault: false },
    });

    await tx.leadStage.update({
      where: { id },
      data: { isDefault: true },
    });
  });

  revalidateCampaignPaths(stage.campaignId);

  return actionSuccess({ id });
}
