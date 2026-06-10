"use client";

import { PlusIcon, StarIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SortableList } from "@/components/ui/sortable-list";
import { slugify } from "@/lib/utils/slug";

export interface StageManagerStage {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  color: string | null;
  isDefault: boolean;
  leadCount: number;
}

interface StageManagerProps {
  stages: StageManagerStage[];
  onStagesChange: (stages: StageManagerStage[]) => void;
  onExistingStageDelete?: (stageId: string) => void;
  disabled?: boolean;
  isPending?: boolean;
}

function withSortOrder(stages: StageManagerStage[]): StageManagerStage[] {
  return stages.map((stage, index) => ({ ...stage, sortOrder: index }));
}

function slugForStage(name: string, stages: StageManagerStage[], stageId: string): string {
  const base = slugify(name) || "stage";
  let candidate = base;
  let counter = 2;

  while (stages.some((stage) => stage.id !== stageId && stage.slug === candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

export function StageManager({
  stages,
  onStagesChange,
  onExistingStageDelete,
  disabled = false,
  isPending = false,
}: StageManagerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  function handleStageNameChange(stageId: string, name: string) {
    onStagesChange(
      stages.map((stage) =>
        stage.id === stageId
          ? { ...stage, name, slug: slugForStage(name, stages, stageId) }
          : stage,
      ),
    );
  }

  function handleStageColorChange(stageId: string, color: string) {
    onStagesChange(stages.map((stage) => (stage.id === stageId ? { ...stage, color } : stage)));
  }

  function handleReorder(reordered: StageManagerStage[]) {
    onStagesChange(withSortOrder(reordered));
  }

  function handleSetDefault(stageId: string) {
    onStagesChange(
      stages.map((stage) => ({
        ...stage,
        isDefault: stage.id === stageId,
      })),
    );
  }

  function handleDelete(stage: StageManagerStage) {
    if (stage.leadCount > 0 || stages.length <= 1) {
      return;
    }

    onExistingStageDelete?.(stage.id);
    onStagesChange(withSortOrder(stages.filter((item) => item.id !== stage.id)));
  }

  function handleAddStage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const id = crypto.randomUUID();

    onStagesChange(
      withSortOrder([
        ...stages,
        {
          id,
          name: newName,
          slug: slugForStage(newName, stages, id),
          sortOrder: stages.length,
          color: newColor,
          isDefault: false,
          leadCount: 0,
        },
      ]),
    );

    setAddOpen(false);
    setNewName("");
    setNewColor("#6366f1");
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium">Pipeline stages</h2>
          <p className="text-muted-foreground text-sm">
            Drag to reorder, rename, and configure stages for this campaign. New leads start in the
            default stage.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" disabled={disabled || isPending}>
              <PlusIcon />
              Add stage
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleAddStage}>
              <DialogHeader>
                <DialogTitle>Add stage</DialogTitle>
                <DialogDescription>
                  Create a new pipeline stage for this campaign.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-stage-name">Name</Label>
                  <Input
                    id="new-stage-name"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="Follow-up"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-stage-color">Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="new-stage-color"
                      type="color"
                      value={newColor}
                      onChange={(event) => setNewColor(event.target.value)}
                      className="h-10 w-16 cursor-pointer p-1"
                      disabled={isPending}
                    />
                    <span className="text-muted-foreground text-sm">{newColor}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  Add stage
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {stages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No stages yet. Add a stage to define this campaign&apos;s pipeline.
        </div>
      ) : (
        <SortableList
          items={stages}
          disabled={disabled || isPending}
          onReorder={handleReorder}
          renderItem={(stage) => (
            <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  type="color"
                  value={stage.color ?? "#6366f1"}
                  onChange={(event) => handleStageColorChange(stage.id, event.target.value)}
                  className="h-10 w-14 shrink-0 cursor-pointer p-1"
                  disabled={disabled || isPending}
                  aria-label={`Color for ${stage.name}`}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    value={stage.name}
                    onChange={(event) => handleStageNameChange(stage.id, event.target.value)}
                    disabled={disabled || isPending}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
                    onClick={() => handleSetDefault(stage.id)}
                    disabled={disabled || isPending}
                  >
                    Set default
                  </Button>
                )}
                <Badge variant="outline">{stage.leadCount} leads</Badge>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => handleDelete(stage)}
                  disabled={disabled || isPending || stage.leadCount > 0 || stages.length === 1}
                  aria-label={`Delete ${stage.name}`}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>
          )}
        />
      )}
    </section>
  );
}
