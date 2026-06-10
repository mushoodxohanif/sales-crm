"use client";

import { EllipsisVerticalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatFieldValueForDisplay,
  getKanbanCardFields,
  getLeadDisplayTitle,
  type LeadFieldDefinition,
} from "@/lib/leads/field-values";

export interface LeadKanbanLead {
  id: string;
  currentStageId: string;
  fieldValues: Array<{ fieldId: string; value: unknown }>;
  updatedAt: string;
  commentCount?: number;
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

  return (
    <>
      <div className="min-w-0 flex-1">
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
