import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
import { LeadForm } from "@/components/leads/lead-form";
import { Button } from "@/components/ui/button";
import { CampaignStatus } from "@/generated/prisma/client";
import { getLeadWithDetails } from "@/lib/data/leads";
import {
  fieldValuesToMap,
  getLeadDisplayTitle,
  toFieldDefinitions,
} from "@/lib/leads/field-values";

interface EditLeadPageProps {
  params: Promise<{ id: string; leadId: string }>;
}

export default async function EditLeadPage({ params }: EditLeadPageProps) {
  const { id: campaignId, leadId } = await params;
  const lead = await getLeadWithDetails(campaignId, leadId);

  if (!lead) {
    notFound();
  }

  const fields = toFieldDefinitions(lead.campaign.campaignType.fields);
  const initialValues = fieldValuesToMap(lead.fieldValues);
  const isArchived = lead.campaign.status === CampaignStatus.ARCHIVED;
  const title = getLeadDisplayTitle(fields, lead.fieldValues);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link href={`/campaigns/${campaignId}`}>Back to campaign</Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {lead.campaign.name} · {lead.currentStage.name}
            </p>
          </div>
          <DeleteLeadButton
            leadId={lead.id}
            campaignId={campaignId}
            leadTitle={title}
            disabled={isArchived}
          />
        </div>
      </div>

      <LeadForm
        campaignId={campaignId}
        campaignName={lead.campaign.name}
        fields={fields}
        stages={lead.campaign.stages}
        initialStageId={lead.currentStageId}
        initialValues={initialValues}
        leadId={lead.id}
        disabled={isArchived}
      />
    </main>
  );
}
