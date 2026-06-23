import { campaignTypeFieldsQuery } from "@/lib/campaign-types/queries";
import { db } from "@/lib/db";

export async function getCampaignTypes() {
  return db.campaignType.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          fields: true,
          campaigns: true,
        },
      },
    },
  });
}

export async function getCampaignTypeWithFields(id: string) {
  return db.campaignType.findUnique({
    where: { id },
    include: {
      fields: campaignTypeFieldsQuery,
      fieldGroups: true,
      _count: {
        select: {
          campaigns: true,
        },
      },
    },
  });
}
