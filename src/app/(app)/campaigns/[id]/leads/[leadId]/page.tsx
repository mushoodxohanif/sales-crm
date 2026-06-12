import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
import { IcpEvaluationPanel } from "@/components/leads/icp-evaluation-panel";
import { LeadForm } from "@/components/leads/lead-form";
import { SetPageTitle } from "@/components/page-title";
import { buttonVariants } from "@/components/ui/button";
import { CampaignStatus } from "@/generated/prisma/client";
import { getLeadWithDetails } from "@/lib/data/leads";
import { toLeadIcpEvaluationClientFromRecord } from "@/lib/icp/serialization";
import {
  fieldValuesToMap,
  getLeadDisplayTitle,
  toFieldDefinitions,
} from "@/lib/leads/field-values";
import { cn } from "@/lib/utils";

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
  const latestIcpEvaluation = lead.icpEvaluations[0]
    ? toLeadIcpEvaluationClientFromRecord(lead.icpEvaluations[0])
    : null;

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <SetPageTitle title={title} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/campaigns/${campaignId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
        >
          Back to campaign
        </Link>
        <DeleteLeadButton
          leadId={lead.id}
          campaignId={campaignId}
          leadTitle={title}
          disabled={isArchived}
        />
      </div>

      <IcpEvaluationPanel
        leadId={lead.id}
        initialEvaluation={latestIcpEvaluation}
        disabled={isArchived}
      />

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
