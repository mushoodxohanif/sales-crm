import Link from "next/link";
import type { DailyTargetProgressItem } from "@/lib/data/daily-targets";
import { cn } from "@/lib/utils";

function TargetProgressBar({ completed, target }: { completed: number; target: number }) {
  const percentage = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  const isComplete = completed >= target;

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          isComplete ? "bg-emerald-500" : "bg-primary",
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

interface TargetProgressListProps {
  targets: DailyTargetProgressItem[];
  variant?: "compact" | "card";
  className?: string;
}

export function TargetProgressList({
  targets,
  variant = "compact",
  className,
}: TargetProgressListProps) {
  if (targets.length === 0) {
    return null;
  }

  return (
    <ul className={cn("space-y-3", className)}>
      {targets.map((target) => {
        const isComplete = target.completed >= target.targetCount;

        return (
          <li
            key={target.id}
            className={cn(
              variant === "card" && "rounded-xl border bg-card p-4 shadow-xs",
              variant === "compact" && "space-y-2",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <p className="truncate font-medium">{target.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {target.campaignName} · {target.stageName}
                </p>
              </div>
              <p
                className={cn(
                  "shrink-0 text-sm font-medium tabular-nums",
                  isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
                )}
              >
                {target.completed}/{target.targetCount}
              </p>
            </div>
            <TargetProgressBar completed={target.completed} target={target.targetCount} />
          </li>
        );
      })}
    </ul>
  );
}

interface DashboardTargetsProps {
  progress: {
    completed: number;
    target: number;
    hasTargets: boolean;
    targets: DailyTargetProgressItem[];
  };
}

export function DashboardTargets({ progress }: DashboardTargetsProps) {
  if (!progress.hasTargets) {
    return (
      <section className="rounded-xl border border-dashed p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Daily targets</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Set goals for how many leads you want to move into each stage every day.
            </p>
          </div>
          <Link href="/targets" className="text-primary text-sm font-medium hover:underline">
            Set up targets
          </Link>
        </div>
      </section>
    );
  }

  const overallComplete = progress.completed >= progress.target;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Today&apos;s targets</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            <span
              className={cn(
                "font-medium",
                overallComplete ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
              )}
            >
              {progress.completed}/{progress.target}
            </span>{" "}
            leads moved to target stages today
          </p>
        </div>
        <Link href="/targets" className="text-primary text-sm font-medium hover:underline">
          Manage targets
        </Link>
      </div>

      <TargetProgressList targets={progress.targets} variant="card" />
    </section>
  );
}
