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
import { deleteDailyTarget, saveDailyTargets } from "@/lib/actions/daily-targets";

type TargetDraft = {
  id?: string;
  name: string;
  leadStageId: string;
  targetCount: number;
};

interface DailyTargetsFormProps {
  initialTargets: DailyTargetWithStage[];
  campaigns: CampaignWithStagesOption[];
}

function toDrafts(targets: DailyTargetWithStage[]): TargetDraft[] {
  return targets.map((target) => ({
    id: target.id,
    name: target.name,
    leadStageId: target.leadStageId,
    targetCount: target.targetCount,
  }));
}

function draftsSignature(drafts: TargetDraft[]) {
  return drafts
    .map(
      (target) =>
        `${target.id ?? "new"}:${target.name}:${target.leadStageId}:${target.targetCount}`,
    )
    .join("|");
}

export function DailyTargetsForm({ initialTargets, campaigns }: DailyTargetsFormProps) {
  const router = useRouter();
  const dailyTargetProgress = useDailyTargetProgressOptional();
  const [isPending, startTransition] = useTransition();
  const [targets, setTargets] = useState<TargetDraft[]>(() => toDrafts(initialTargets));
  const [newCampaignId, setNewCampaignId] = useState<string>("");
  const [newStageId, setNewStageId] = useState<string>("");
  const [newTargetName, setNewTargetName] = useState("");
  const [newTargetCount, setNewTargetCount] = useState("5");

  const initialDrafts = useMemo(() => toDrafts(initialTargets), [initialTargets]);
  const _initialTargetsSignature = useMemo(() => draftsSignature(initialDrafts), [initialDrafts]);
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
        target.name !== initial.name ||
        target.leadStageId !== initial.leadStageId ||
        target.targetCount !== initial.targetCount
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
    const name = newTargetName.trim();

    if (!newStageId) {
      toast.error("Select a stage for the new target.");
      return;
    }

    if (!name) {
      toast.error("Enter a name for the target.");
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

    setTargets((current) => [...current, { name, leadStageId: newStageId, targetCount }]);
    setNewStageId("");
    setNewTargetName("");
    setNewTargetCount("5");
  }

  function handleRemoveTarget(target: TargetDraft) {
    if (target.id) {
      startTransition(async () => {
        const result = await deleteDailyTarget({ id: target.id });

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        setTargets((current) => current.filter((item) => item.leadStageId !== target.leadStageId));
        toast.success("Target removed");
        await dailyTargetProgress?.refreshProgress();
        router.refresh();
      });
      return;
    }

    setTargets((current) => current.filter((item) => item.leadStageId !== target.leadStageId));
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

  function handleTargetNameChange(leadStageId: string, value: string) {
    setTargets((current) =>
      current.map((target) =>
        target.leadStageId === leadStageId ? { ...target, name: value } : target,
      ),
    );
  }

  function handleSave() {
    const hasEmptyName = targets.some((target) => !target.name.trim());

    if (hasEmptyName) {
      toast.error("Every target needs a name.");
      return;
    }

    startTransition(async () => {
      const result = await saveDailyTargets({
        targets: targets.map((target) => ({
          ...target,
          name: target.name.trim(),
        })),
      });

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
            floating targets panel as you move leads on the kanban.
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
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`target-name-${target.leadStageId}`}>Name</Label>
                      <Input
                        id={`target-name-${target.leadStageId}`}
                        value={target.name}
                        onChange={(event) =>
                          handleTargetNameChange(target.leadStageId, event.target.value)
                        }
                        disabled={isPending}
                        placeholder="e.g. Morning outreach"
                        maxLength={100}
                      />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {campaignName} · {stageName}
                    </p>
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
                      onClick={() => handleRemoveTarget(target)}
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
            Give your target a name, pick a campaign stage, and set how many leads you want to move
            there today.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="target-name">Name</Label>
              <Input
                id="target-name"
                value={newTargetName}
                onChange={(event) => setNewTargetName(event.target.value)}
                disabled={isPending}
                placeholder="e.g. Close deals"
                maxLength={100}
              />
            </div>

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
                onValueChange={(value) => {
                  setNewStageId(value);
                  const stage = availableStages.find((item) => item.id === value);

                  if (stage && !newTargetName.trim()) {
                    setNewTargetName(stage.name);
                  }
                }}
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
