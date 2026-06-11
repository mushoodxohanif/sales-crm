"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useDailyTargetProgressOptional } from "@/components/targets/daily-target-progress-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CampaignWithStagesOption, DailyTargetWithStage } from "@/lib/actions/daily-targets";
import { saveDailyTargets } from "@/lib/actions/daily-targets";

type TargetDraft = {
  leadStageId: string;
  targetCount: number;
};

interface DailyTargetsFormProps {
  initialTargets: DailyTargetWithStage[];
  campaigns: CampaignWithStagesOption[];
}

function toDrafts(targets: DailyTargetWithStage[]): TargetDraft[] {
  return targets.map((target) => ({
    leadStageId: target.leadStageId,
    targetCount: target.targetCount,
  }));
}

export function DailyTargetsForm({ initialTargets, campaigns }: DailyTargetsFormProps) {
  const router = useRouter();
  const dailyTargetProgress = useDailyTargetProgressOptional();
  const [isPending, startTransition] = useTransition();
  const [targets, setTargets] = useState<TargetDraft[]>(() => toDrafts(initialTargets));
  const [newCampaignId, setNewCampaignId] = useState<string>("");
  const [newStageId, setNewStageId] = useState<string>("");
  const [newTargetCount, setNewTargetCount] = useState("5");

  const initialDrafts = useMemo(() => toDrafts(initialTargets), [initialTargets]);
  const usedStageIds = useMemo(
    () => new Set(targets.map((target) => target.leadStageId)),
    [targets],
  );

  useEffect(() => {
    setTargets(toDrafts(initialTargets));
  }, [initialTargets]);

  const hasChanges = useMemo(() => {
    if (targets.length !== initialDrafts.length) {
      return true;
    }

    return targets.some((target, index) => {
      const initial = initialDrafts[index];
      return (
        target.leadStageId !== initial.leadStageId || target.targetCount !== initial.targetCount
      );
    });
  }, [targets, initialDrafts]);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === newCampaignId);
  const availableStages =
    selectedCampaign?.stages.filter((stage) => !usedStageIds.has(stage.id)) ?? [];

  function getStageLabel(leadStageId: string) {
    for (const campaign of campaigns) {
      const stage = campaign.stages.find((item) => item.id === leadStageId);

      if (stage) {
        return {
          campaignName: campaign.name,
          stageName: stage.name,
        };
      }
    }

    const existing = initialTargets.find((target) => target.leadStageId === leadStageId);

    if (existing) {
      return {
        campaignName: existing.leadStage.campaign.name,
        stageName: existing.leadStage.name,
      };
    }

    return {
      campaignName: "Unknown campaign",
      stageName: "Unknown stage",
    };
  }

  function handleAddTarget() {
    const targetCount = Number.parseInt(newTargetCount, 10);

    if (!newStageId) {
      toast.error("Select a stage for the new target.");
      return;
    }

    if (!Number.isFinite(targetCount) || targetCount < 1) {
      toast.error("Target must be at least 1.");
      return;
    }

    if (usedStageIds.has(newStageId)) {
      toast.error("You already have a target for this stage.");
      return;
    }

    setTargets((current) => [...current, { leadStageId: newStageId, targetCount }]);
    setNewStageId("");
    setNewTargetCount("5");
  }

  function handleRemoveTarget(leadStageId: string) {
    setTargets((current) => current.filter((target) => target.leadStageId !== leadStageId));
  }

  function handleTargetCountChange(leadStageId: string, value: string) {
    const targetCount = Number.parseInt(value, 10);

    if (!Number.isFinite(targetCount) || targetCount < 1) {
      return;
    }

    setTargets((current) =>
      current.map((target) =>
        target.leadStageId === leadStageId ? { ...target, targetCount } : target,
      ),
    );
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveDailyTargets({ targets });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Daily targets saved");
      await dailyTargetProgress?.refreshProgress();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {targets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <h2 className="font-medium">No daily targets yet</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Set how many leads you want to move into each stage every day. Progress appears in the
            header as you move leads on the kanban.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-xs">
          <ul className="divide-y">
            {targets.map((target) => {
              const { campaignName, stageName } = getStageLabel(target.leadStageId);

              return (
                <li
                  key={target.leadStageId}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{stageName}</p>
                    <p className="text-muted-foreground text-sm">{campaignName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`target-${target.leadStageId}`} className="sr-only">
                        Daily target for {stageName}
                      </Label>
                      <Input
                        id={`target-${target.leadStageId}`}
                        type="number"
                        min={1}
                        className="w-20"
                        value={target.targetCount}
                        onChange={(event) =>
                          handleTargetCountChange(target.leadStageId, event.target.value)
                        }
                        disabled={isPending}
                      />
                      <span className="text-muted-foreground text-sm">/ day</span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveTarget(target.leadStageId)}
                      disabled={isPending}
                      aria-label={`Remove target for ${stageName}`}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {campaigns.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Create an active campaign with pipeline stages before setting targets.
        </p>
      ) : (
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <h2 className="font-medium">Add target</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Pick a campaign stage and how many leads you want to move there today.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="target-campaign">Campaign</Label>
              <Select
                value={newCampaignId}
                onValueChange={(value) => {
                  setNewCampaignId(value);
                  setNewStageId("");
                }}
                disabled={isPending}
              >
                <SelectTrigger id="target-campaign" className="w-full">
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-stage">Stage</Label>
              <Select
                value={newStageId}
                onValueChange={setNewStageId}
                disabled={isPending || !newCampaignId || availableStages.length === 0}
              >
                <SelectTrigger id="target-stage" className="w-full">
                  <SelectValue
                    placeholder={
                      !newCampaignId
                        ? "Select a campaign first"
                        : availableStages.length === 0
                          ? "No stages available"
                          : "Select stage"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-count">Target</Label>
              <Input
                id="target-count"
                type="number"
                min={1}
                value={newTargetCount}
                onChange={(event) => setNewTargetCount(event.target.value)}
                disabled={isPending}
                className="w-24"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddTarget}
              disabled={isPending || !newStageId}
            >
              <PlusIcon />
              Add
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={isPending || !hasChanges}>
          {isPending ? "Saving..." : "Save targets"}
        </Button>
      </div>
    </div>
  );
}
