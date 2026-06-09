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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { LeadCard, type LeadKanbanLead, type LeadKanbanStage } from "@/components/leads/lead-card";
import { LeadEditDialog } from "@/components/leads/lead-edit-dialog";
import { moveLeadToStage } from "@/lib/actions/leads";
import type { LeadFieldDefinition } from "@/lib/leads/field-values";
import { cn } from "@/lib/utils";

const KANBAN_COLUMN_COUNT = 6;
const KANBAN_COLUMN_GAP = "1rem";
const KANBAN_COLUMN_WIDTH = `calc((100cqw - ${KANBAN_COLUMN_COUNT - 1} * ${KANBAN_COLUMN_GAP}) / ${KANBAN_COLUMN_COUNT})`;

interface LeadKanbanProps {
  campaignId: string;
  campaignName: string;
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
      style={{ width: KANBAN_COLUMN_WIDTH, minWidth: KANBAN_COLUMN_WIDTH }}
      className={cn(
        "flex h-full shrink-0 flex-col gap-2 rounded-lg border bg-muted/20 p-2 transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-1.5 rounded-md border bg-muted/40 px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: stage.color ?? "#6366f1" }}
          />
          <span className="truncate font-medium text-xs">{stage.name}</span>
        </div>
        <span className="text-muted-foreground text-[10px]">{stage.leads.length}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">{children}</div>
    </div>
  );
}

function DraggableLeadCard({
  fields,
  lead,
  disabled,
  onEdit,
}: {
  fields: LeadFieldDefinition[];
  lead: LeadKanbanLead;
  disabled: boolean;
  onEdit: () => void;
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
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-1 rounded-md border bg-background px-1.5 py-1 shadow-xs",
        disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      {...attributes}
      {...listeners}
    >
      <LeadCard fields={fields} lead={lead} disabled={disabled} onEdit={onEdit} />
    </article>
  );
}

export function LeadKanban({
  campaignId,
  campaignName,
  fields,
  stages: initialStages,
  disabled = false,
}: LeadKanbanProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stages, setStages] = useState(initialStages);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<LeadKanbanLead | null>(null);

  useEffect(() => {
    setStages(initialStages);
  }, [initialStages]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const totalLeads = stages.reduce((count, stage) => count + stage.leads.length, 0);
  const stageOptions = stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    isDefault: stage.isDefault,
  }));
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
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
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
        <>
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="@container/kanban min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
              <div className="flex h-full w-max min-w-full gap-4 pb-2">
                {stages.map((stage) => (
                  <KanbanColumn key={stage.id} stage={stage}>
                    {stage.leads.map((lead) => (
                      <DraggableLeadCard
                        key={lead.id}
                        fields={fields}
                        lead={lead}
                        disabled={disabled || isPending}
                        onEdit={() => setEditingLead(lead)}
                      />
                    ))}
                  </KanbanColumn>
                ))}
              </div>
            </div>

            <DragOverlay>
              {activeLead ? (
                <article
                  style={{ width: KANBAN_COLUMN_WIDTH }}
                  className="flex rotate-2 items-center gap-1 rounded-md border bg-background px-1.5 py-1 opacity-95 shadow-xs"
                >
                  <LeadCard fields={fields} lead={activeLead} disabled />
                </article>
              ) : null}
            </DragOverlay>
          </DndContext>

          <LeadEditDialog
            open={editingLead !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingLead(null);
              }
            }}
            campaignId={campaignId}
            campaignName={campaignName}
            fields={fields}
            stages={stageOptions}
            lead={editingLead}
            disabled={disabled}
          />
        </>
      )}
    </section>
  );
}
