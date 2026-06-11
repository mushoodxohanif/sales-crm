"use client";

import { Settings2Icon, TargetIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useDailyTargetProgress } from "@/components/targets/daily-target-progress-provider";
import { TargetProgressList } from "@/components/targets/target-progress-list";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TargetFloatingPanel() {
  const { progress } = useDailyTargetProgress();
  const [isOpen, setIsOpen] = useState(false);

  if (!progress?.hasTargets) {
    return (
      <div className="pointer-events-none fixed right-4 bottom-4 z-40">
        <Link
          href="/targets"
          className="pointer-events-auto flex size-12 items-center justify-center rounded-full border bg-card shadow-lg transition-transform hover:scale-105"
          aria-label="Set up daily targets"
        >
          <TargetIcon className="text-muted-foreground size-5" />
        </Link>
      </div>
    );
  }

  const overallComplete = progress.completed >= progress.target;

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3">
      {isOpen ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-card shadow-lg duration-200">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">Today&apos;s targets</p>
              <p
                className={cn(
                  "text-sm tabular-nums",
                  overallComplete
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {progress.completed}/{progress.target} total
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon-sm" asChild>
                <Link href="/targets" aria-label="Manage targets">
                  <Settings2Icon className="size-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsOpen(false)}
                aria-label="Close targets panel"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-4">
            <TargetProgressList targets={progress.targets} variant="compact" />
          </div>
        </div>
      ) : null}

      <Button
        size="icon"
        className={cn(
          "relative size-12 rounded-full shadow-lg",
          overallComplete && "bg-emerald-600 hover:bg-emerald-600/90",
        )}
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Close targets panel" : "View today's targets"}
        aria-expanded={isOpen}
      >
        <TargetIcon className="size-5" />
        {!isOpen ? (
          <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-background px-1 text-[10px] font-semibold text-foreground shadow-sm ring-1 ring-border">
            {progress.completed}/{progress.target}
          </span>
        ) : null}
      </Button>
    </div>
  );
}
