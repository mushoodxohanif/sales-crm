import { ArrowUpRightIcon, FileUpIcon, FolderKanbanIcon, LayersIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { ImportStatus } from "@/generated/prisma/client";
import { getLeadDisplayTitle, toFieldDefinitions } from "@/lib/leads/field-values";

type RecentLead = {
  id: string;
  updatedAt: Date;
  currentStage: {
    name: string;
    color: string | null;
  };
  campaign: {
    id: string;
    name: string;
    campaignType: {
      fields: Array<{
        id: string;
        key: string;
        label: string;
        fieldType: Parameters<typeof toFieldDefinitions>[0][number]["fieldType"];
        required: boolean;
        sortOrder: number;
        options: unknown;
      }>;
    };
  };
  fieldValues: Array<{ fieldId: string; value: unknown }>;
};

type RecentCampaign = {
  id: string;
  name: string;
  createdAt: Date;
  campaignType: {
    name: string;
  };
  _count: {
    leads: number;
  };
};

type RecentImport = {
  id: string;
  fileName: string;
  rowCount: number;
  status: ImportStatus;
  createdAt: Date;
  campaign: {
    id: string;
    name: string;
  } | null;
};

function formatRelativeTime(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);

  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, "day");
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function importStatusLabel(status: ImportStatus): string {
  switch (status) {
    case "UPLOADED":
      return "Uploaded";
    case "ANALYZED":
      return "Analyzed";
    case "COMMITTED":
      return "Completed";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}

function importStatusVariant(
  status: ImportStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "COMMITTED":
      return "default";
    case "FAILED":
      return "destructive";
    case "ANALYZED":
      return "secondary";
    default:
      return "outline";
  }
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-row items-start justify-between gap-4 border-b px-4 py-3">
      <div className="space-y-1">
        <h2 className="font-heading text-base font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

interface RecentActivityProps {
  recentLeads: RecentLead[];
  recentCampaigns: RecentCampaign[];
  recentImports: RecentImport[];
}

export function RecentActivity({
  recentLeads,
  recentCampaigns,
  recentImports,
}: RecentActivityProps) {
  const hasActivity =
    recentLeads.length > 0 || recentCampaigns.length > 0 || recentImports.length > 0;

  if (!hasActivity) {
    return (
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-heading text-base font-medium">Recent activity</h2>
          <p className="text-sm text-muted-foreground">
            Lead updates, new campaigns, and imports will show up here.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/campaign-types/new" className={buttonVariants()}>
            <LayersIcon />
            Create campaign type
          </Link>
          <Link href="/import" className={buttonVariants({ variant: "outline" })}>
            <FileUpIcon />
            Import leads
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border bg-card shadow-xs">
        <SectionHeader
          title="Recent leads"
          description="Latest lead updates across all campaigns."
          action={
            <Link href="/campaigns" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              View campaigns
              <ArrowUpRightIcon />
            </Link>
          }
        />
        <div className="px-4 py-3">
          {recentLeads.length === 0 ? (
            <p className="text-muted-foreground text-sm">No leads yet.</p>
          ) : (
            <ul className="divide-y">
              {recentLeads.map((lead) => {
                const fields = toFieldDefinitions(lead.campaign.campaignType.fields);
                const title = getLeadDisplayTitle(fields, lead.fieldValues);

                return (
                  <li
                    key={lead.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/campaigns/${lead.campaign.id}/leads/${lead.id}`}
                        className="block truncate font-medium text-sm hover:underline"
                      >
                        {title}
                      </Link>
                      <p className="text-muted-foreground truncate text-xs">{lead.campaign.name}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{lead.currentStage.name}</Badge>
                        <span className="text-muted-foreground text-xs">
                          {formatRelativeTime(lead.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <UserIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <div className="space-y-6">
        <section className="rounded-xl border bg-card shadow-xs">
          <SectionHeader
            title="Recent campaigns"
            description="Newly created lead collections."
            action={
              <Link
                href="/campaigns/new"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                New campaign
                <ArrowUpRightIcon />
              </Link>
            }
          />
          <div className="px-4 py-3">
            {recentCampaigns.length === 0 ? (
              <p className="text-muted-foreground text-sm">No campaigns yet.</p>
            ) : (
              <ul className="divide-y">
                {recentCampaigns.map((campaign) => (
                  <li
                    key={campaign.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="block truncate font-medium text-sm hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{campaign.campaignType.name}</Badge>
                        <span className="text-muted-foreground text-xs">
                          {campaign._count.leads} lead{campaign._count.leads === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Created {formatRelativeTime(campaign.createdAt)}
                      </p>
                    </div>
                    <FolderKanbanIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card shadow-xs">
          <SectionHeader
            title="Recent imports"
            description="Spreadsheet uploads and bulk lead commits."
            action={
              <Link href="/import" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Import leads
                <ArrowUpRightIcon />
              </Link>
            }
          />
          <div className="px-4 py-3">
            {recentImports.length === 0 ? (
              <p className="text-muted-foreground text-sm">No imports yet.</p>
            ) : (
              <ul className="divide-y">
                {recentImports.map((leadImport) => (
                  <li
                    key={leadImport.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium text-sm">{leadImport.fileName}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={importStatusVariant(leadImport.status)}>
                          {importStatusLabel(leadImport.status)}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {leadImport.rowCount} row{leadImport.rowCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      {leadImport.campaign ? (
                        <Link
                          href={`/campaigns/${leadImport.campaign.id}`}
                          className="text-muted-foreground block truncate text-xs hover:underline"
                        >
                          {leadImport.campaign.name}
                        </Link>
                      ) : (
                        <p className="text-muted-foreground text-xs">No campaign linked</p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {formatRelativeTime(leadImport.createdAt)}
                      </p>
                    </div>
                    <FileUpIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
