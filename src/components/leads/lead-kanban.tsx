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
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { KanbanToolbar } from "@/components/leads/kanban-toolbar";
import { LeadCard, type LeadKanbanLead, type LeadKanbanStage } from "@/components/leads/lead-card";
import { LeadDetailDialog } from "@/components/leads/lead-detail-dialog";
import { useSetLeadCount } from "@/components/page-title";
import { useDailyTargetProgressOptional } from "@/components/targets/daily-target-progress-provider";
import { moveLeadToStage } from "@/lib/actions/leads";
import type { LeadIcpEvaluationClient } from "@/lib/icp/serialization";
import type { LeadFieldDefinition } from "@/lib/leads/field-values";
import {
  applyKanbanFilters,
  DEFAULT_KANBAN_FILTER_STATE,
  getFilteredLeadCount,
  hasActiveKanbanFilters,
  type KanbanFilterState,
} from "@/lib/leads/kanban-filters";
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
  initialCommentLeadId?: string;
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
  onOpen,
}: {
  fields: LeadFieldDefinition[];
  lead: LeadKanbanLead;
  disabled: boolean;
  onOpen: () => void;
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
        "flex items-center gap-1 rounded-md border bg-background px-1.5 py-1 shadow-xs",
        disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      {...attributes}
      {...listeners}
    >
      <LeadCard fields={fields} lead={lead} disabled={disabled} onOpen={onOpen} />
    </article>
  );
}

export function LeadKanban({
  campaignId,
  campaignName,
  fields,
  stages: initialStages,
  disabled = false,
  initialCommentLeadId,
}: LeadKanbanProps) {
  const router = useRouter();
  const setLeadCount = useSetLeadCount();
  const dailyTargetProgress = useDailyTargetProgressOptional();
  const [isPending, startTransition] = useTransition();
  const [stages, setStages] = useState(initialStages);
  const [filterState, setFilterState] = useState<KanbanFilterState>(DEFAULT_KANBAN_FILTER_STATE);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadKanbanLead | null>(null);
  const [focusCommentsOnOpen, setFocusCommentsOnOpen] = useState(false);
  const [openedCommentFromDeepLink, setOpenedCommentFromDeepLink] = useState(false);

  useEffect(() => {
    setStages(initialStages);
  }, [initialStages]);

  useEffect(() => {
    if (!initialCommentLeadId) {
      return;
    }

    const lead = stages
      .flatMap((stage) => stage.leads)
      .find((item) => item.id === initialCommentLeadId);

    if (lead) {
      setSelectedLead(lead);
      setFocusCommentsOnOpen(true);
      setOpenedCommentFromDeepLink(true);
    }
  }, [initialCommentLeadId, stages]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filteredStages = useMemo(
    () => applyKanbanFilters(stages, fields, filterState),
    [stages, fields, filterState],
  );

  const totalLeads = stages.reduce((count, stage) => count + stage.leads.length, 0);
  const filteredLeadCount = getFilteredLeadCount(filteredStages);
  const showEmptyFilters = hasActiveKanbanFilters(filterState) && filteredLeadCount === 0;

  useEffect(() => {
    setLeadCount?.(filteredLeadCount);
  }, [filteredLeadCount, setLeadCount]);

  function handleLeadDeleted(leadId: string) {
    setStages((current) =>
      current.map((stage) => ({
        ...stage,
        leads: stage.leads.filter((lead) => lead.id !== leadId),
      })),
    );
    setSelectedLead(null);
  }

  function handleIcpEvaluated(leadId: string, evaluation: LeadIcpEvaluationClient) {
    setStages((current) =>
      current.map((stage) => ({
        ...stage,
        leads: stage.leads.map((lead) =>
          lead.id === leadId ? { ...lead, icpEvaluation: evaluation } : lead,
        ),
      })),
    );
    setSelectedLead((current) =>
      current?.id === leadId ? { ...current, icpEvaluation: evaluation } : current,
    );
  }

  function handleIcpCleared(leadId: string) {
    setStages((current) =>
      current.map((stage) => ({
        ...stage,
        leads: stage.leads.map((lead) =>
          lead.id === leadId ? { ...lead, icpEvaluation: null } : lead,
        ),
      })),
    );
    setSelectedLead((current) =>
      current?.id === leadId ? { ...current, icpEvaluation: null } : current,
    );
  }

  const stageOptions = stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    isDefault: stage.isDefault,
    color: stage.color,
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
      await dailyTargetProgress?.refreshProgress();
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
          <KanbanToolbar fields={fields} state={filterState} onChange={setFilterState} />

          {showEmptyFilters ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No leads match your filters.{" "}
              <button
                type="button"
                className="text-foreground underline"
                onClick={() => setFilterState(DEFAULT_KANBAN_FILTER_STATE)}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="@container/kanban min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex h-full w-max min-w-full gap-4 pb-2">
                  {filteredStages.map((stage) => (
                    <KanbanColumn key={stage.id} stage={stage}>
                      {stage.leads.map((lead) => (
                        <DraggableLeadCard
                          key={lead.id}
                          fields={fields}
                          lead={lead}
                          disabled={disabled || isPending}
                          onOpen={() => {
                            setFocusCommentsOnOpen(false);
                            setSelectedLead(lead);
                          }}
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
          )}

          <LeadDetailDialog
            open={selectedLead !== null}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedLead(null);
                setFocusCommentsOnOpen(false);

                if (openedCommentFromDeepLink) {
                  router.replace(`/campaigns/${campaignId}`);
                  setOpenedCommentFromDeepLink(false);
                }
              }
            }}
            campaignId={campaignId}
            campaignName={campaignName}
            fields={fields}
            stages={stageOptions}
            lead={selectedLead}
            disabled={disabled}
            focusCommentsOnOpen={focusCommentsOnOpen}
            onLeadDeleted={handleLeadDeleted}
            onIcpEvaluated={handleIcpEvaluated}
            onIcpCleared={handleIcpCleared}
          />
        </>
      )}
    </section>
  );
}
