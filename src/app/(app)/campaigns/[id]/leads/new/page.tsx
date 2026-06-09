import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/leads/lead-form";
import { Button } from "@/components/ui/button";
import { CampaignStatus } from "@/generated/prisma/client";
import { getLeadFormContext } from "@/lib/data/leads";
import { toFieldDefinitions } from "@/lib/leads/field-values";

interface NewLeadPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewLeadPage({ params }: NewLeadPageProps) {
  const { id: campaignId } = await params;
  const campaign = await getLeadFormContext(campaignId);

  if (!campaign) {
    notFound();
  }

  const isArchived = campaign.status === CampaignStatus.ARCHIVED;
  const fields = toFieldDefinitions(campaign.campaignType.fields);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link href={`/campaigns/${campaignId}`}>Back to campaign</Link>
        </Button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Add lead</h1>
          <p className="text-muted-foreground mt-1 text-sm">{campaign.name}</p>
        </div>
      </div>

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
        />
      )}
    </main>
  );
}
