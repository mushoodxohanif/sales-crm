import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignSettingsForm } from "@/components/campaigns/campaign-settings-form";
import { LeadKanban } from "@/components/leads/lead-kanban";
import { SetPageTitle } from "@/components/page-title";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignStatus } from "@/generated/prisma/client";
import { getCampaignWithStagesAndLeads } from "@/lib/data/leads";
import { toFieldDefinitions } from "@/lib/leads/field-values";
import { cn } from "@/lib/utils";

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ commentLead?: string }>;
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: CampaignDetailPageProps) {
  const { id } = await params;
  const { commentLead } = await searchParams;
  const campaign = await getCampaignWithStagesAndLeads(id);

  if (!campaign) {
    notFound();
  }

  const isArchived = campaign.status === CampaignStatus.ARCHIVED;
  const leadCount = campaign.stages.reduce((count, stage) => count + stage.leads.length, 0);
  const fields = toFieldDefinitions(campaign.campaignType.fields);

  const stages = campaign.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    slug: stage.slug,
    sortOrder: stage.sortOrder,
    color: stage.color,
    isDefault: stage.isDefault,
    leadCount: stage.leads.length,
  }));

  const kanbanStages = campaign.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    slug: stage.slug,
    color: stage.color,
    sortOrder: stage.sortOrder,
    isDefault: stage.isDefault,
    leads: stage.leads.map((lead) => ({
      id: lead.id,
      currentStageId: lead.currentStageId,
      fieldValues: lead.fieldValues.map((fieldValue) => ({
        fieldId: fieldValue.fieldId,
        value: fieldValue.value,
      })),
      updatedAt: lead.updatedAt.toISOString(),
      commentCount: lead._count.comments,
    })),
  }));

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4">
      <SetPageTitle title={campaign.name} />

      <Tabs
        defaultValue="pipeline"
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden"
      >
        <div className="flex shrink-0 items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <Link
            href={`/campaigns/${campaign.id}/leads/new`}
            aria-disabled={isArchived || undefined}
            tabIndex={isArchived ? -1 : undefined}
            className={cn(
              buttonVariants({ size: "sm" }),
              isArchived && "pointer-events-none opacity-50",
            )}
          >
            <PlusIcon />
            Add lead
          </Link>
        </div>

        <TabsContent
          value="pipeline"
          className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          <LeadKanban
            campaignId={campaign.id}
            campaignName={campaign.name}
            fields={fields}
            stages={kanbanStages}
            disabled={isArchived}
            initialCommentLeadId={commentLead}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-0 min-h-0 flex-1 overflow-auto">
          <CampaignSettingsForm
            campaignId={campaign.id}
            initialName={campaign.name}
            initialStages={stages}
            status={campaign.status}
            leadCount={leadCount}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
