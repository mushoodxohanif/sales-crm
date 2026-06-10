import { db } from "@/lib/db";

export async function getCampaignWithStagesAndLeads(campaignId: string) {
  return db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      campaignType: {
        include: {
          fields: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      stages: {
        orderBy: { sortOrder: "asc" },
        include: {
          leads: {
            include: {
              fieldValues: true,
              _count: {
                select: { comments: true },
              },
            },
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });
}

export async function getLeadFormContext(campaignId: string) {
  return db.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      status: true,
      campaignType: {
        include: {
          fields: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      stages: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          isDefault: true,
        },
      },
    },
  });
}

export async function getLeadWithDetails(campaignId: string, leadId: string) {
  return db.lead.findFirst({
    where: {
      id: leadId,
      campaignId,
    },
    include: {
      currentStage: {
        select: {
          id: true,
          name: true,
        },
      },
      fieldValues: true,
      campaign: {
        select: {
          id: true,
          name: true,
          status: true,
          campaignType: {
            include: {
              fields: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
          stages: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              isDefault: true,
            },
          },
        },
      },
    },
  });
}
