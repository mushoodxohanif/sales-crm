import { CampaignStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getUtcDayBounds } from "@/lib/leads/stage-transitions";

export type DailyTargetProgressItem = {
  id: string;
  name: string;
  leadStageId: string;
  stageName: string;
  campaignName: string;
  stageColor: string | null;
  targetCount: number;
  completed: number;
};

export type DailyTargetProgressSummary = {
  completed: number;
  target: number;
  hasTargets: boolean;
  targets: DailyTargetProgressItem[];
};

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
          color: true,
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

export async function getDailyTargetProgressForUser(
  userId: string,
): Promise<DailyTargetProgressSummary> {
  const targets = await db.dailyTarget.findMany({
    where: { userId },
    orderBy: [{ leadStage: { campaign: { name: "asc" } } }, { leadStage: { sortOrder: "asc" } }],
    select: {
      id: true,
      name: true,
      leadStageId: true,
      targetCount: true,
      leadStage: {
        select: {
          name: true,
          color: true,
          campaign: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (targets.length === 0) {
    return {
      completed: 0,
      target: 0,
      hasTargets: false,
      targets: [],
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
    if (!transition.toStageId) {
      continue;
    }

    completedByStage.set(
      transition.toStageId,
      (completedByStage.get(transition.toStageId) ?? 0) + 1,
    );
  }

  let completed = 0;
  let target = 0;

  const targetItems: DailyTargetProgressItem[] = targets.map((dailyTarget) => {
    const itemCompleted = completedByStage.get(dailyTarget.leadStageId) ?? 0;

    completed += itemCompleted;
    target += dailyTarget.targetCount;

    return {
      id: dailyTarget.id,
      name: dailyTarget.name,
      leadStageId: dailyTarget.leadStageId,
      stageName: dailyTarget.leadStage.name,
      campaignName: dailyTarget.leadStage.campaign.name,
      stageColor: dailyTarget.leadStage.color,
      targetCount: dailyTarget.targetCount,
      completed: itemCompleted,
    };
  });

  return {
    completed,
    target,
    hasTargets: true,
    targets: targetItems,
  };
}
