import { ArrowUpRightIcon, FileUpIcon, FolderKanbanIcon, LayersIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Lead updates, new campaigns, and imports will show up here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/campaign-types/new">
              <LayersIcon />
              Create campaign type
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/import">
              <FileUpIcon />
              Import leads
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Recent leads</CardTitle>
            <CardDescription>Latest lead updates across all campaigns.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/campaigns">
              View campaigns
              <ArrowUpRightIcon />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Recent campaigns</CardTitle>
              <CardDescription>Newly created lead collections.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/campaigns/new">
                New campaign
                <ArrowUpRightIcon />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Recent imports</CardTitle>
              <CardDescription>Spreadsheet uploads and bulk lead commits.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/import">
                Import leads
                <ArrowUpRightIcon />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
