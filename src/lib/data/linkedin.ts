import { CampaignStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getLeadDisplayTitle, toFieldDefinitions } from "@/lib/leads/field-values";

export type LinkedInLeadOption = {
  id: string;
  title: string;
  campaignName: string;
  hasConnectionNoteField: boolean;
};

export async function getLinkedInToolLeadOptions(): Promise<LinkedInLeadOption[]> {
  const leads = await db.lead.findMany({
    where: {
      campaign: {
        status: { not: CampaignStatus.ARCHIVED },
      },
    },
    include: {
      fieldValues: true,
      campaign: {
        select: {
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
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return leads.map((lead) => {
    const fields = toFieldDefinitions(lead.campaign.campaignType.fields);

    return {
      id: lead.id,
      title: getLeadDisplayTitle(fields, lead.fieldValues),
      campaignName: lead.campaign.name,
      hasConnectionNoteField: fields.some((field) => field.key === "connection_note"),
    };
  });
}
