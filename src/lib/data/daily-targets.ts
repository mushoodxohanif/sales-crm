import { CampaignStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getUtcDayBounds } from "@/lib/leads/stage-transitions";

export async function getUserDailyTargets(userId: string) {
  return db.dailyTarget.findMany({
    where: { userId },
    orderBy: [{ leadStage: { campaign: { name: "asc" } } }, { leadStage: { sortOrder: "asc" } }],
    include: {
      leadStage: {
        select: {
          id: true,
          name: true,
          slug: true,
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

export async function getActiveCampaignsWithStages() {
  return db.campaign.findMany({
    where: { status: CampaignStatus.ACTIVE },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      stages: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
        },
      },
    },
  });
}

export async function getDailyTargetProgressForUser(userId: string) {
  const targets = await db.dailyTarget.findMany({
    where: { userId },
    select: {
      id: true,
      leadStageId: true,
      targetCount: true,
    },
  });

  if (targets.length === 0) {
    return {
      completed: 0,
      target: 0,
      hasTargets: false,
    };
  }

  const { start, end } = getUtcDayBounds();
  const stageIds = targets.map((target) => target.leadStageId);

  const transitions = await db.leadStageTransition.findMany({
    where: {
      userId,
      toStageId: { in: stageIds },
      createdAt: { gte: start, lt: end },
      lead: {
        campaign: {
          status: CampaignStatus.ACTIVE,
        },
      },
    },
    select: {
      leadId: true,
      toStageId: true,
    },
    distinct: ["leadId", "toStageId"],
  });

  const completedByStage = new Map<string, number>();

  for (const transition of transitions) {
    completedByStage.set(
      transition.toStageId,
      (completedByStage.get(transition.toStageId) ?? 0) + 1,
    );
  }

  let completed = 0;
  let target = 0;

  for (const dailyTarget of targets) {
    target += dailyTarget.targetCount;
    completed += completedByStage.get(dailyTarget.leadStageId) ?? 0;
  }

  return {
    completed,
    target,
    hasTargets: true,
  };
}
