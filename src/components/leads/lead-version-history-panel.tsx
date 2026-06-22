"use client";

import {
  ArrowRightLeftIcon,
  HistoryIcon,
  Loader2Icon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
  Undo2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useDailyTargetProgressOptional } from "@/components/targets/daily-target-progress-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchLeadVersions,
  type LeadVersionPayload,
  type RevertedLeadPayload,
  revertLeadToVersion,
} from "@/lib/actions/lead-versions";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";

interface LeadVersionHistoryPanelProps {
  leadId: string;
  active: boolean;
  disabled?: boolean;
  onReverted?: (lead: RevertedLeadPayload) => void;
}

function getInitials(name: string | null): string {
  if (!name) {
    return "?";
  }

  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function getChangeTypeIcon(changeType: LeadVersionPayload["changeType"]) {
  switch (changeType) {
    case "CREATED":
      return PlusIcon;
    case "STAGE_MOVED":
      return ArrowRightLeftIcon;
    case "REVERTED":
      return RotateCcwIcon;
    default:
      return SaveIcon;
  }
}

function getChangeTypeLabel(changeType: LeadVersionPayload["changeType"]) {
  switch (changeType) {
    case "CREATED":
      return "Created";
    case "STAGE_MOVED":
      return "Stage move";
    case "REVERTED":
      return "Reverted";
    default:
      return "Updated";
  }
}

function isLeadCreationVersion(version: LeadVersionPayload): boolean {
  return version.changeType === "CREATED";
}

function versionSnapshotsEqual(left: LeadVersionPayload, right: LeadVersionPayload): boolean {
  if (left.stageId !== right.stageId) {
    return false;
  }

  return JSON.stringify(left.fieldValues) === JSON.stringify(right.fieldValues);
}

function getCurrentVersion(versions: LeadVersionPayload[]): LeadVersionPayload | undefined {
  return versions.find((version) => version.isCurrent);
}

function getUndoLastChangeTarget(versions: LeadVersionPayload[]): LeadVersionPayload | undefined {
  const current = getCurrentVersion(versions);

  if (!current) {
    return undefined;
  }

  return versions.find((version) => !version.isCurrent && !versionSnapshotsEqual(version, current));
}

function getPreviousVersion(versions: LeadVersionPayload[]): LeadVersionPayload | undefined {
  return getUndoLastChangeTarget(versions);
}

function canUndoFromVersion(version: LeadVersionPayload, versions: LeadVersionPayload[]): boolean {
  if (isLeadCreationVersion(version)) {
    return false;
  }

  if (version.isCurrent) {
    return getPreviousVersion(versions) !== undefined;
  }

  return true;
}

function getUndoTarget(
  version: LeadVersionPayload,
  versions: LeadVersionPayload[],
): LeadVersionPayload | undefined {
  if (!canUndoFromVersion(version, versions)) {
    return undefined;
  }

  if (version.isCurrent) {
    return getUndoLastChangeTarget(versions);
  }

  return version;
}

export function LeadVersionHistoryPanel({
  leadId,
  active,
  disabled = false,
  onReverted,
}: LeadVersionHistoryPanelProps) {
  const router = useRouter();
  const dailyTargetProgress = useDailyTargetProgressOptional();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [versions, setVersions] = useState<LeadVersionPayload[]>([]);
  const [pendingUndoVersion, setPendingUndoVersion] = useState<LeadVersionPayload | null>(null);

  const previousVersion = getPreviousVersion(versions);
  const canUndo = previousVersion !== undefined;

  const loadVersions = useCallback(async (leadIdToLoad: string) => {
    setIsLoading(true);

    const result = await fetchLeadVersions(leadIdToLoad);

    if (result.success) {
      setVersions(result.data);
    } else {
      toast.error(result.error);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!active || !leadId) {
      return;
    }

    void loadVersions(leadId);
  }, [active, leadId, loadVersions]);

  useEffect(() => {
    if (!active) {
      setVersions([]);
      setPendingUndoVersion(null);
    }
  }, [active]);

  function handleConfirmUndo() {
    if (!pendingUndoVersion) {
      return;
    }

    startTransition(async () => {
      const result = await revertLeadToVersion({
        leadId,
        versionId: pendingUndoVersion.id,
        allowCreationTarget: pendingUndoVersion.changeType === "CREATED",
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Lead restored to selected version");
      setPendingUndoVersion(null);
      onReverted?.(result.data.lead);
      await loadVersions(leadId);
      await dailyTargetProgress?.refreshProgress();
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {canUndo && previousVersion ? (
          <div className="shrink-0 border-b px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              disabled={disabled || isPending}
              onClick={() => setPendingUndoVersion(previousVersion)}
            >
              <Undo2Icon className="size-3.5" />
              Undo last change
            </Button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <HistoryIcon className="size-8 opacity-40" />
              <p className="text-sm">No version history yet.</p>
              <p className="text-xs">Updates will appear here after the lead is changed.</p>
            </div>
          ) : (
            <ol className="relative space-y-0">
              {versions.map((version, index) => {
                const Icon = getChangeTypeIcon(version.changeType);
                const authorName = version.user?.name ?? "System";
                const isLast = index === versions.length - 1;
                const undoTarget = getUndoTarget(version, versions);
                const showUndo = undoTarget !== undefined;

                return (
                  <li key={version.id} className="relative flex gap-3 pb-6 last:pb-0">
                    {!isLast ? (
                      <span
                        aria-hidden
                        className="absolute top-7 left-[11px] h-[calc(100%-12px)] w-px bg-border"
                      />
                    ) : null}

                    <div
                      className={cn(
                        "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background",
                        version.isCurrent && "border-primary text-primary",
                      )}
                    >
                      <Icon className="size-3" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-medium text-sm">{version.summary}</span>
                            {version.isCurrent ? (
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary uppercase tracking-wide">
                                Current
                              </span>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="size-1.5 rounded-full"
                                style={{ backgroundColor: version.stageColor ?? "#6366f1" }}
                              />
                              {version.stageName}
                            </span>
                            <span className="text-border">·</span>
                            <span>{getChangeTypeLabel(version.changeType)}</span>
                            <span className="text-border">·</span>
                            <span>{formatRelativeTime(version.createdAt)}</span>
                          </div>
                        </div>

                        {showUndo ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 shrink-0 gap-1 px-2.5"
                            disabled={disabled || isPending}
                            onClick={() => {
                              if (undoTarget) {
                                setPendingUndoVersion(undoTarget);
                              }
                            }}
                          >
                            <Undo2Icon className="size-3.5" />
                            Undo
                          </Button>
                        ) : null}
                      </div>

                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar size="sm" className="size-5 shrink-0">
                          <AvatarImage src={version.user?.image ?? undefined} alt={authorName} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(version.user?.name ?? null)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-muted-foreground text-xs">{authorName}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      <Dialog
        open={pendingUndoVersion !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingUndoVersion(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Undo to this version?</DialogTitle>
            <DialogDescription>
              This will restore the lead&apos;s stage and field values to how they were{" "}
              {pendingUndoVersion
                ? formatRelativeTime(pendingUndoVersion.createdAt)
                : "at that point"}
              . A new history entry will be recorded.
            </DialogDescription>
          </DialogHeader>
          {pendingUndoVersion ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{pendingUndoVersion.summary}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Stage: {pendingUndoVersion.stageName}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setPendingUndoVersion(null)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={isPending} onClick={handleConfirmUndo}>
              {isPending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Undoing...
                </>
              ) : (
                <>
                  <Undo2Icon />
                  Undo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
