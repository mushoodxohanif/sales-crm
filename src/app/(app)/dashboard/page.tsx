import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatCards } from "@/components/dashboard/stat-cards";
import { SetPageTitle } from "@/components/page-title";
import { DashboardTargets } from "@/components/targets/target-progress-list";
import { buttonVariants } from "@/components/ui/button";
import { getDailyTargetProgressForUser } from "@/lib/data/daily-targets";
import { getDashboardData } from "@/lib/data/dashboard";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [dashboard, targetProgress] = await Promise.all([
    getDashboardData(),
    userId ? getDailyTargetProgressForUser(userId) : null,
  ]);
  const firstName = session?.user?.name?.split(/\s+/)[0];

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <SetPageTitle title={firstName ? `Welcome back, ${firstName}` : "Dashboard"} />
      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/import" className={buttonVariants({ variant: "outline" })}>
          Import leads
        </Link>
        <Link href="/campaigns/new" className={buttonVariants()}>
          <PlusIcon />
          New campaign
        </Link>
      </div>

      <StatCards stats={dashboard.stats} />

      {targetProgress ? <DashboardTargets progress={targetProgress} /> : null}

      <RecentActivity
        recentLeads={dashboard.recentLeads}
        recentCampaigns={dashboard.recentCampaigns}
        recentImports={dashboard.recentImports}
      />
    </main>
  );
}
