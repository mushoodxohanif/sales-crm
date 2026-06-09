"use client";

import { PlusIcon, StarIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SortableList } from "@/components/ui/sortable-list";
import { DEFAULT_STAGES } from "@/lib/campaigns/default-stages";
import { slugify } from "@/lib/utils/slug";

export type CampaignStageDraft = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  color: string;
  isDefault: boolean;
};

function createStageDraft(
  index: number,
  overrides?: Partial<CampaignStageDraft>,
): CampaignStageDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    slug: "",
    sortOrder: index,
    color: "#6366f1",
    isDefault: false,
    ...overrides,
  };
}

function defaultStageDrafts(): CampaignStageDraft[] {
  return DEFAULT_STAGES.map((stage, index) =>
    createStageDraft(index, {
      name: stage.name,
      slug: stage.slug,
      sortOrder: stage.sortOrder,
      color: stage.color,
      isDefault: stage.isDefault,
    }),
  );
}

interface CampaignStageEditorProps {
  stages: CampaignStageDraft[];
  onChange: (stages: CampaignStageDraft[]) => void;
  disabled?: boolean;
}

export function CampaignStageEditor({
  stages,
  onChange,
  disabled = false,
}: CampaignStageEditorProps) {
  const [manualSlugs, setManualSlugs] = useState<Set<string>>(new Set());

  function reorderStages(nextStages: CampaignStageDraft[]) {
    onChange(nextStages.map((stage, index) => ({ ...stage, sortOrder: index })));
  }

  function updateStage(id: string, patch: Partial<CampaignStageDraft>) {
    onChange(
      stages.map((stage) => {
        if (stage.id !== id) {
          return patch.isDefault ? { ...stage, isDefault: false } : stage;
        }

        const next = { ...stage, ...patch };

        if ("name" in patch && patch.name !== undefined && !manualSlugs.has(id)) {
          next.slug = slugify(patch.name);
        }

        return next;
      }),
    );
  }

  function addStage() {
    onChange([...stages, createStageDraft(stages.length)]);
  }

  function removeStage(id: string) {
    const next = stages.filter((stage) => stage.id !== id);
    if (next.length === 0) {
      return;
    }

    if (!next.some((stage) => stage.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }

    reorderStages(next);
  }

  return (
    <div className="space-y-4">
      <SortableList
        items={stages}
        onReorder={reorderStages}
        disabled={disabled}
        renderItem={(stage) => (
          <div className="rounded-lg border p-4">
            <div className="grid gap-4 md:grid-cols-[auto,1fr,1fr,auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor={`${stage.id}-color`}>Color</Label>
                <Input
                  id={`${stage.id}-color`}
                  type="color"
                  value={stage.color}
                  onChange={(event) => updateStage(stage.id, { color: event.target.value })}
                  className="h-10 w-16 cursor-pointer p-1"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${stage.id}-name`}>Name</Label>
                <Input
                  id={`${stage.id}-name`}
                  value={stage.name}
                  onChange={(event) => updateStage(stage.id, { name: event.target.value })}
                  placeholder="Intro"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${stage.id}-slug`}>Slug</Label>
                <Input
                  id={`${stage.id}-slug`}
                  value={stage.slug}
                  onChange={(event) => {
                    setManualSlugs((current) => new Set(current).add(stage.id));
                    updateStage(stage.id, { slug: event.target.value });
                  }}
                  placeholder="intro"
                  disabled={disabled}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {stage.isDefault ? (
                  <Badge variant="secondary">
                    <StarIcon className="size-3" />
                    Default
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateStage(stage.id, { isDefault: true })}
                    disabled={disabled}
                  >
                    Set default
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeStage(stage.id)}
                  disabled={disabled || stages.length === 1}
                  aria-label={`Remove ${stage.name || "stage"}`}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>
          </div>
        )}
      />

      <Button type="button" variant="outline" size="sm" onClick={addStage} disabled={disabled}>
        <PlusIcon />
        Add stage
      </Button>
    </div>
  );
}

interface CampaignStageSetupProps {
  useCustomStages: boolean;
  onUseCustomStagesChange: (value: boolean) => void;
  stages: CampaignStageDraft[];
  onStagesChange: (stages: CampaignStageDraft[]) => void;
  disabled?: boolean;
}

export function CampaignStageSetup({
  useCustomStages,
  onUseCustomStagesChange,
  stages,
  onStagesChange,
  disabled = false,
}: CampaignStageSetupProps) {
  const defaultPreview = useMemo(() => DEFAULT_STAGES.map((stage) => stage.name).join(" → "), []);

  function handleToggle(checked: boolean) {
    onUseCustomStagesChange(checked);
    if (checked && stages.length === 0) {
      onStagesChange(defaultStageDrafts());
    }
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
      <div>
        <h2 className="text-base font-medium">Pipeline stages</h2>
        <p className="text-muted-foreground text-sm">
          Use the default pipeline or customize stages before creating the campaign.
        </p>
      </div>

      <Label className="flex items-center gap-2 font-normal">
        <Checkbox
          checked={useCustomStages}
          onCheckedChange={(checked) => handleToggle(checked === true)}
          disabled={disabled}
        />
        Customize pipeline stages
      </Label>

      {useCustomStages ? (
        <CampaignStageEditor stages={stages} onChange={onStagesChange} disabled={disabled} />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          Default stages: {defaultPreview}
        </p>
      )}
    </section>
  );
}

export { defaultStageDrafts };
