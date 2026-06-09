import { FileUpIcon, FolderKanbanIcon, LayersIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

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
          <Link
            key={card.key}
            href={card.href}
            className="group block h-full rounded-xl border bg-card p-4 shadow-xs transition-colors group-hover:bg-muted/40"
          >
            <div className="flex flex-row items-center justify-between pb-2">
              <p className="text-sm font-medium">{card.label}</p>
              <Icon className="text-muted-foreground size-4" />
            </div>
            <p className="text-3xl font-semibold tracking-tight">{value}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {card.key === "campaignCount"
                ? `${stats.activeCampaignCount} active`
                : card.description}
            </p>
          </Link>
        );
      })}

      <Link
        href="/import"
        className="group block h-full rounded-xl border border-dashed bg-card p-4 shadow-xs transition-colors group-hover:bg-muted/40"
      >
        <div className="flex flex-row items-center justify-between pb-2">
          <p className="text-sm font-medium">Import leads</p>
          <FileUpIcon className="text-muted-foreground size-4" />
        </div>
        <p className="text-3xl font-semibold tracking-tight">CSV / XLSX</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Upload a spreadsheet to bulk-create leads
        </p>
      </Link>
    </div>
  );
}
