import Link from "next/link";
import { notFound } from "next/navigation";
import { EditCampaignForm } from "@/components/campaigns/edit-campaign-form";
import { StageManager } from "@/components/campaigns/stage-manager";
import { LeadKanban } from "@/components/leads/lead-kanban";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignStatus } from "@/generated/prisma/client";
import { getCampaignWithStagesAndLeads } from "@/lib/data/leads";
import { toFieldDefinitions } from "@/lib/leads/field-values";

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const campaign = await getCampaignWithStagesAndLeads(id);

  if (!campaign) {
    notFound();
  }

  const isArchived = campaign.status === CampaignStatus.ARCHIVED;
  const fields = toFieldDefinitions(campaign.campaignType.fields);
  const totalLeads = campaign.stages.reduce((count, stage) => count + stage.leads.length, 0);

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
    leads: stage.leads.map((lead) => ({
      id: lead.id,
      currentStageId: lead.currentStageId,
      fieldValues: lead.fieldValues.map((fieldValue) => ({
        fieldId: fieldValue.fieldId,
        value: fieldValue.value,
      })),
      updatedAt: lead.updatedAt.toISOString(),
    })),
  }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link href="/campaigns">Back to campaigns</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{campaign.name}</h1>
          <Badge variant="secondary">{campaign.campaignType.name}</Badge>
          {isArchived ? <Badge variant="outline">Archived</Badge> : null}
        </div>
        <p className="text-muted-foreground text-sm">
          {totalLeads} lead{totalLeads === 1 ? "" : "s"} across {campaign.stages.length} stage
          {campaign.stages.length === 1 ? "" : "s"}
        </p>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <section className="rounded-xl border bg-card p-6 shadow-xs">
            <LeadKanban
              campaignId={campaign.id}
              fields={fields}
              stages={kanbanStages}
              disabled={isArchived}
            />
          </section>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-6">
          <StageManager campaignId={campaign.id} initialStages={stages} disabled={isArchived} />
          <EditCampaignForm
            campaignId={campaign.id}
            initialName={campaign.name}
            status={campaign.status}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
