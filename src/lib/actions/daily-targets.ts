"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { CampaignStatus } from "@/generated/prisma/client";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import {
  type DailyTargetProgressSummary,
  getActiveCampaignsWithStages,
  getDailyTargetProgressForUser,
  getUserDailyTargets,
} from "@/lib/data/daily-targets";
import { db } from "@/lib/db";
import { deleteDailyTargetSchema, saveDailyTargetsSchema } from "@/lib/validators/daily-target";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input.";
}

function revalidateTargetPaths() {
  revalidatePath("/targets");
  revalidatePath("/dashboard");
}

export type DailyTargetProgress = DailyTargetProgressSummary;

export type DailyTargetWithStage = Awaited<ReturnType<typeof getUserDailyTargets>>[number];

export type CampaignWithStagesOption = Awaited<
  ReturnType<typeof getActiveCampaignsWithStages>
>[number];

export async function getDailyTargetProgress(): Promise<ActionResult<DailyTargetProgress>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const progress = await getDailyTargetProgressForUser(userId);
  return actionSuccess(progress);
}

export async function getDailyTargetsPageData(): Promise<
  ActionResult<{
    targets: DailyTargetWithStage[];
    campaigns: CampaignWithStagesOption[];
  }>
> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const [targets, campaigns] = await Promise.all([
    getUserDailyTargets(userId),
    getActiveCampaignsWithStages(),
  ]);

  return actionSuccess({ targets, campaigns });
}

export async function saveDailyTargets(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = saveDailyTargetsSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const stageIds = [...new Set(parsed.data.targets.map((target) => target.leadStageId))];

  if (stageIds.length !== parsed.data.targets.length) {
    return actionError("Each stage can only have one target.");
  }

  if (stageIds.length > 0) {
    const [stages, existingTargets] = await Promise.all([
      db.leadStage.findMany({
        where: { id: { in: stageIds } },
        select: {
          id: true,
          campaign: { select: { status: true } },
        },
      }),
      db.dailyTarget.findMany({
        where: { userId },
        select: { leadStageId: true },
      }),
    ]);

    if (stages.length !== stageIds.length) {
      return actionError("One or more selected stages are invalid.");
    }

    const existingStageIds = new Set(existingTargets.map((target) => target.leadStageId));

    for (const stage of stages) {
      const isNewTarget = !existingStageIds.has(stage.id);

      if (isNewTarget && stage.campaign.status === CampaignStatus.ARCHIVED) {
        return actionError("Cannot add targets for archived campaigns.");
      }
    }
  }

  await db.$transaction(async (tx) => {
    await tx.dailyTarget.deleteMany({ where: { userId } });

    if (parsed.data.targets.length > 0) {
      await tx.dailyTarget.createMany({
        data: parsed.data.targets.map((target) => ({
          userId,
          name: target.name,
          leadStageId: target.leadStageId,
          targetCount: target.targetCount,
        })),
      });
    }
  });

  revalidateTargetPaths();
  return actionSuccess(undefined);
}

export async function deleteDailyTarget(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = deleteDailyTargetSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const target = await db.dailyTarget.findFirst({
    where: {
      id: parsed.data.id,
      userId,
    },
    select: { id: true },
  });

  if (!target) {
    return actionError("Target not found.");
  }

  await db.dailyTarget.delete({
    where: { id: parsed.data.id },
  });

  revalidateTargetPaths();
  return actionSuccess(undefined);
}
