import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/leads/lead-form";
import { SetPageTitle } from "@/components/page-title";
import { buttonVariants } from "@/components/ui/button";
import { CampaignStatus } from "@/generated/prisma/client";
import { getLeadFormContext } from "@/lib/data/leads";
import { toFieldDefinitions } from "@/lib/leads/field-values";
import { cn } from "@/lib/utils";

interface NewLeadPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string }>;
}

export default async function NewLeadPage({ params, searchParams }: NewLeadPageProps) {
  const { id: campaignId } = await params;
  const { stage: initialStageId } = await searchParams;
  const campaign = await getLeadFormContext(campaignId);

  if (!campaign) {
    notFound();
  }

  const isArchived = campaign.status === CampaignStatus.ARCHIVED;
  const fields = toFieldDefinitions(campaign.campaignType.fields);

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <SetPageTitle title="Add lead" />
      <Link
        href={`/campaigns/${campaignId}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
      >
        Back to campaign
      </Link>

      {isArchived ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          This campaign is archived. Restore it before adding new leads.
        </div>
      ) : (
        <LeadForm
          campaignId={campaign.id}
          campaignName={campaign.name}
          fields={fields}
          stages={campaign.stages}
          initialStageId={initialStageId}
        />
      )}
    </main>
  );
}
