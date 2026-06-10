"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { DeleteCampaignButton } from "@/components/campaigns/delete-campaign-button";
import { StageManager, type StageManagerStage } from "@/components/campaigns/stage-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { archiveCampaign, restoreCampaign, saveCampaignSettings } from "@/lib/actions/campaigns";

type CampaignStatusValue = "ACTIVE" | "ARCHIVED";

interface CampaignSettingsFormProps {
  campaignId: string;
  initialName: string;
  initialStages: StageManagerStage[];
  status: CampaignStatusValue;
  leadCount: number;
}

function isPersistedStageId(stageId: string, initialStageIds: Set<string>) {
  return initialStageIds.has(stageId);
}

function stagesEqual(left: StageManagerStage[], right: StageManagerStage[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((stage, index) => {
    const other = right[index];
    return (
      stage.id === other.id &&
      stage.name === other.name &&
      stage.slug === other.slug &&
      stage.sortOrder === other.sortOrder &&
      stage.color === other.color &&
      stage.isDefault === other.isDefault &&
      stage.leadCount === other.leadCount
    );
  });
}

export function CampaignSettingsForm({
  campaignId,
  initialName,
  initialStages,
  status,
  leadCount,
}: CampaignSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [stages, setStages] = useState(initialStages);
  const [deletedStageIds, setDeletedStageIds] = useState<string[]>([]);
  const isArchived = status === "ARCHIVED";

  const initialStageIds = useMemo(
    () => new Set(initialStages.map((stage) => stage.id)),
    [initialStages],
  );

  const _initialStagesKey = useMemo(() => JSON.stringify(initialStages), [initialStages]);

  useEffect(() => {
    setName(initialName);
    setStages(initialStages);
    setDeletedStageIds([]);
  }, [initialName, initialStages]);

  const hasChanges =
    name !== initialName || deletedStageIds.length > 0 || !stagesEqual(stages, initialStages);

  function handleExistingStageDelete(stageId: string) {
    if (!isPersistedStageId(stageId, initialStageIds)) {
      return;
    }

    setDeletedStageIds((current) => (current.includes(stageId) ? current : [...current, stageId]));
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasChanges) {
      return;
    }

    startTransition(async () => {
      const result = await saveCampaignSettings({
        id: campaignId,
        name,
        stages: stages.map((stage) => ({
          ...(isPersistedStageId(stage.id, initialStageIds) ? { id: stage.id } : {}),
          name: stage.name,
          slug: stage.slug,
          color: stage.color,
          isDefault: stage.isDefault,
        })),
        deletedStageIds,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Campaign settings saved");
      setDeletedStageIds([]);
      router.refresh();
    });
  }

  function handleArchiveToggle() {
    startTransition(async () => {
      const result = isArchived
        ? await restoreCampaign({ id: campaignId })
        : await archiveCampaign({ id: campaignId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isArchived ? "Campaign restored" : "Campaign archived");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <StageManager
        stages={stages}
        onStagesChange={setStages}
        onExistingStageDelete={handleExistingStageDelete}
        disabled={isArchived}
        isPending={isPending}
      />

      <section className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
        <div>
          <h2 className="text-base font-medium">Campaign settings</h2>
          <p className="text-muted-foreground text-sm">Update the campaign name or archive it.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaign-name">Name</Label>
          <Input
            id="campaign-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isPending || isArchived}
            required
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isPending || isArchived || !hasChanges}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
          <Button
            type="button"
            variant={isArchived ? "default" : "outline"}
            onClick={handleArchiveToggle}
            disabled={isPending}
          >
            {isArchived ? "Restore campaign" : "Archive campaign"}
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-destructive/30 bg-card p-6 shadow-xs">
        <div>
          <h2 className="text-base font-medium text-destructive">Danger zone</h2>
          <p className="text-muted-foreground text-sm">
            Permanently delete this campaign and all of its leads.
          </p>
        </div>
        <DeleteCampaignButton id={campaignId} name={name} leadCount={leadCount} />
      </section>
    </form>
  );
}
