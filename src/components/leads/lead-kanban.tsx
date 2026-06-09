"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { LeadCard, type LeadKanbanLead, type LeadKanbanStage } from "@/components/leads/lead-card";
import { Button } from "@/components/ui/button";
import { moveLeadToStage } from "@/lib/actions/leads";
import type { LeadFieldDefinition } from "@/lib/leads/field-values";
import { cn } from "@/lib/utils";

interface LeadKanbanProps {
  campaignId: string;
  fields: LeadFieldDefinition[];
  stages: LeadKanbanStage[];
  disabled?: boolean;
}

function columnId(stageId: string) {
  return `column-${stageId}`;
}

function KanbanColumn({ stage, children }: { stage: LeadKanbanStage; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId(stage.id),
    data: { stageId: stage.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-3 rounded-xl border bg-muted/20 p-3 transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: stage.color ?? "#6366f1" }}
          />
          <span className="truncate font-medium text-sm">{stage.name}</span>
        </div>
        <span className="text-muted-foreground text-xs">{stage.leads.length}</span>
      </div>

      <div className="flex min-h-32 flex-col gap-3">{children}</div>
    </div>
  );
}

function DraggableLeadCard({
  campaignId,
  fields,
  stages,
  lead,
  disabled,
}: {
  campaignId: string;
  fields: LeadFieldDefinition[];
  stages: Array<{ id: string; name: string }>;
  lead: LeadKanbanLead;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { stageId: lead.currentStageId, leadId: lead.id },
    disabled,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
      <LeadCard
        campaignId={campaignId}
        fields={fields}
        stages={stages}
        lead={lead}
        disabled={disabled}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function LeadKanban({
  campaignId,
  fields,
  stages: initialStages,
  disabled = false,
}: LeadKanbanProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stages, setStages] = useState(initialStages);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  useEffect(() => {
    setStages(initialStages);
  }, [initialStages]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const totalLeads = stages.reduce((count, stage) => count + stage.leads.length, 0);
  const stageOptions = stages.map((stage) => ({ id: stage.id, name: stage.name }));
  const activeLead = stages
    .flatMap((stage) => stage.leads)
    .find((lead) => lead.id === activeLeadId);

  function handleDragStart(event: DragStartEvent) {
    setActiveLeadId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLeadId(null);

    const leadId = String(event.active.id);
    const overId = event.over?.id;

    if (!overId) {
      return;
    }

    const targetStageId = String(overId).startsWith("column-")
      ? String(overId).replace("column-", "")
      : stages.find((stage) => stage.leads.some((lead) => lead.id === overId))?.id;

    if (!targetStageId) {
      return;
    }

    const sourceStage = stages.find((stage) => stage.leads.some((lead) => lead.id === leadId));
    const lead = sourceStage?.leads.find((item) => item.id === leadId);

    if (!lead || lead.currentStageId === targetStageId) {
      return;
    }

    setStages((current) =>
      current.map((stage) => {
        if (stage.id === sourceStage?.id) {
          return {
            ...stage,
            leads: stage.leads.filter((item) => item.id !== leadId),
          };
        }

        if (stage.id === targetStageId) {
          return {
            ...stage,
            leads: [{ ...lead, currentStageId: targetStageId }, ...stage.leads],
          };
        }

        return stage;
      }),
    );

    startTransition(async () => {
      const result = await moveLeadToStage({
        leadId,
        stageId: targetStageId,
      });

      if (!result.success) {
        toast.error(result.error);
        setStages(initialStages);
        return;
      }

      toast.success("Lead moved");
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium">Pipeline</h2>
          <p className="text-muted-foreground text-sm">
            {totalLeads} lead{totalLeads === 1 ? "" : "s"} across {stages.length} stage
            {stages.length === 1 ? "" : "s"}. Drag cards between columns or use the stage dropdown
            on each card.
          </p>
        </div>
        <Button size="sm" disabled={disabled} asChild>
          <Link href={`/campaigns/${campaignId}/leads/new`}>
            <PlusIcon />
            Add lead
          </Link>
        </Button>
      </div>

      {stages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Add pipeline stages before creating leads.
        </div>
      ) : totalLeads === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No leads yet.{" "}
          {disabled ? null : (
            <Link href={`/campaigns/${campaignId}/leads/new`} className="text-foreground underline">
              Add your first lead
            </Link>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4">
              {stages.map((stage) => (
                <KanbanColumn key={stage.id} stage={stage}>
                  {stage.leads.map((lead) => (
                    <DraggableLeadCard
                      key={lead.id}
                      campaignId={campaignId}
                      fields={fields}
                      stages={stageOptions}
                      lead={lead}
                      disabled={disabled || isPending}
                    />
                  ))}
                </KanbanColumn>
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeLead ? (
              <div className="w-72 rotate-2 opacity-95">
                <LeadCard
                  campaignId={campaignId}
                  fields={fields}
                  stages={stageOptions}
                  lead={activeLead}
                  disabled
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </section>
  );
}
