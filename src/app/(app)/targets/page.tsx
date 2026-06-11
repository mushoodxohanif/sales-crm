import { auth } from "@/auth";
import { SetPageTitle } from "@/components/page-title";
import { DailyTargetsForm } from "@/components/targets/daily-targets-form";
import {
  getActiveCampaignsWithStages,
  getDailyTargetProgressForUser,
  getUserDailyTargets,
} from "@/lib/data/daily-targets";

export default async function TargetsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const [targets, campaigns, progress] = await Promise.all([
    getUserDailyTargets(userId),
    getActiveCampaignsWithStages(),
    getDailyTargetProgressForUser(userId),
  ]);

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <SetPageTitle title="Daily targets" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Daily targets</h1>
        <p className="text-muted-foreground text-sm">
          Set how many leads you want to move into each pipeline stage every day.
          {progress.hasTargets ? (
            <>
              {" "}
              Today&apos;s progress: {progress.completed}/{progress.target}.
            </>
          ) : null}
        </p>
      </div>

      <DailyTargetsForm initialTargets={targets} campaigns={campaigns} />
    </main>
  );
}
