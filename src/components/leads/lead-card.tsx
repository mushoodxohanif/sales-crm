"use client";

import { EllipsisVerticalIcon } from "lucide-react";
import { IcpDecisionBadge } from "@/components/leads/icp-evaluation-panel";
import { Button } from "@/components/ui/button";
import type { LeadIcpEvaluationClient } from "@/lib/actions/icp";
import {
  formatFieldValueForDisplay,
  getKanbanCardFields,
  getLeadDisplayTitle,
  type LeadFieldDefinition,
} from "@/lib/leads/field-values";
import { getDaysSinceCreation } from "@/lib/leads/kanban-filters";

export interface LeadKanbanLead {
  id: string;
  currentStageId: string;
  fieldValues: Array<{ fieldId: string; value: unknown }>;
  createdAt: string;
  updatedAt: string;
  commentCount?: number;
  icpEvaluation?: LeadIcpEvaluationClient | null;
}

export interface LeadKanbanStage {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  sortOrder: number;
  isDefault: boolean;
  leads: LeadKanbanLead[];
}

interface LeadCardProps {
  fields: LeadFieldDefinition[];
  lead: LeadKanbanLead;
  disabled?: boolean;
  onOpen?: () => void;
}

export function LeadCard({ fields, lead, disabled = false, onOpen }: LeadCardProps) {
  const kanbanFields = getKanbanCardFields(fields);
  const valueByFieldId = new Map(
    lead.fieldValues.map((fieldValue) => [fieldValue.fieldId, fieldValue.value]),
  );
  const title = getLeadDisplayTitle(fields, lead.fieldValues);
  const daysInPipeline = getDaysSinceCreation(lead.createdAt);

  return (
    <>
      <div className="relative min-w-0 flex-1 pr-5">
        <div className="absolute top-0 right-0 flex flex-col items-end gap-0.5">
          <span className="text-muted-foreground text-[10px] tabular-nums">
            {daysInPipeline}d<span className="sr-only"> days in pipeline</span>
          </span>
          {lead.icpEvaluation ? <IcpDecisionBadge evaluation={lead.icpEvaluation} /> : null}
        </div>
        {kanbanFields.length > 0 ? (
          kanbanFields.map((field, index) => {
            const value = valueByFieldId.get(field.id);
            const displayValue = formatFieldValueForDisplay(value);

            return (
              <p
                key={field.id}
                className={
                  index === 0
                    ? "truncate text-xs font-medium"
                    : "text-muted-foreground truncate text-[11px]"
                }
              >
                {displayValue}
              </p>
            );
          })
        ) : (
          <p className="truncate text-xs font-medium">{title}</p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-6 shrink-0"
        disabled={disabled}
        aria-label={`Open ${title}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onOpen}
      >
        <EllipsisVerticalIcon className="size-3.5" />
      </Button>
    </>
  );
}
