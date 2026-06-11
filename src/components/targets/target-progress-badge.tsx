"use client";

import Link from "next/link";
import { useDailyTargetProgress } from "@/components/targets/daily-target-progress-provider";
import { Badge } from "@/components/ui/badge";

export function TargetProgressBadge() {
  const { progress } = useDailyTargetProgress();

  if (!progress?.hasTargets) {
    return null;
  }

  return (
    <Link href="/targets" className="shrink-0">
      <Badge variant="secondary" className="font-normal hover:bg-secondary/80">
        {progress.completed}/{progress.target} today
      </Badge>
    </Link>
  );
}
