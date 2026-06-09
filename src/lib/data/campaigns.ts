import { db } from "@/lib/db";

export async function getCampaigns() {
  return db.campaign.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      campaignType: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          leads: true,
          stages: true,
        },
      },
    },
  });
}

export async function getCampaignTypesForSelect() {
  return db.campaignType.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
}

export async function getCampaignWithStages(id: string) {
  return db.campaign.findUnique({
    where: { id },
    include: {
      campaignType: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      stages: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { leads: true },
          },
        },
      },
      _count: {
        select: { leads: true },
      },
    },
  });
}
