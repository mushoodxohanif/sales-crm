import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatCards } from "@/components/dashboard/stat-cards";
import { Button } from "@/components/ui/button";
import { getDashboardData } from "@/lib/data/dashboard";

export default async function DashboardPage() {
  const [session, dashboard] = await Promise.all([auth(), getDashboardData()]);
  const firstName = session?.user?.name?.split(/\s+/)[0];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {firstName ? `Welcome back, ${firstName}` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Overview of campaign types, campaigns, leads, and recent activity across your CRM.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/import">Import leads</Link>
          </Button>
          <Button asChild>
            <Link href="/campaigns/new">
              <PlusIcon />
              New campaign
            </Link>
          </Button>
        </div>
      </div>

      <StatCards stats={dashboard.stats} />

      <RecentActivity
        recentLeads={dashboard.recentLeads}
        recentCampaigns={dashboard.recentCampaigns}
        recentImports={dashboard.recentImports}
      />
    </main>
  );
}
