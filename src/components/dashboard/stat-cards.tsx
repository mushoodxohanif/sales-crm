import { FileUpIcon, FolderKanbanIcon, LayersIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStats {
  campaignTypeCount: number;
  campaignCount: number;
  activeCampaignCount: number;
  leadCount: number;
}

const statCards = [
  {
    key: "campaignTypeCount",
    label: "Campaign types",
    description: "Reusable lead schemas",
    href: "/campaign-types",
    icon: LayersIcon,
  },
  {
    key: "campaignCount",
    label: "Campaigns",
    description: "Active lead collections",
    href: "/campaigns",
    icon: FolderKanbanIcon,
  },
  {
    key: "leadCount",
    label: "Leads",
    description: "Prospects across pipelines",
    href: "/campaigns",
    icon: UsersIcon,
  },
] as const;

interface StatCardsProps {
  stats: DashboardStats;
}

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key];

        return (
          <Link key={card.key} href={card.href} className="group block">
            <Card className="h-full transition-colors group-hover:bg-muted/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <Icon className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight">{value}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {card.key === "campaignCount"
                    ? `${stats.activeCampaignCount} active`
                    : card.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}

      <Link href="/import" className="group block">
        <Card className="h-full border-dashed transition-colors group-hover:bg-muted/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Import leads</CardTitle>
            <FileUpIcon className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">CSV / XLSX</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Upload a spreadsheet to bulk-create leads
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
