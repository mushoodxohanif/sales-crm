import { db } from "@/lib/db";

export async function getDashboardData() {
  const [
    campaignTypeCount,
    campaignCount,
    activeCampaignCount,
    leadCount,
    recentLeads,
    recentCampaigns,
    recentImports,
  ] = await Promise.all([
    db.campaignType.count(),
    db.campaign.count(),
    db.campaign.count({ where: { status: "ACTIVE" } }),
    db.lead.count(),
    db.lead.findMany({
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: {
        currentStage: {
          select: {
            name: true,
            color: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            campaignType: {
              include: {
                fields: {
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        },
        fieldValues: true,
      },
    }),
    db.campaign.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        campaignType: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            leads: true,
          },
        },
      },
    }),
    db.leadImport.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    stats: {
      campaignTypeCount,
      campaignCount,
      activeCampaignCount,
      leadCount,
    },
    recentLeads,
    recentCampaigns,
    recentImports,
  };
}
