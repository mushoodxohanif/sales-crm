"use client";

import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLeadDisplayTitle, type LeadFieldDefinition } from "@/lib/leads/field-values";

export interface LeadKanbanLead {
  id: string;
  currentStageId: string;
  fieldValues: Array<{ fieldId: string; value: unknown }>;
  updatedAt: string;
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
  onEdit?: () => void;
}

export function LeadCard({ fields, lead, disabled = false, onEdit }: LeadCardProps) {
  const title = getLeadDisplayTitle(fields, lead.fieldValues);

  return (
    <>
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{title}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-6 shrink-0"
        disabled={disabled}
        aria-label={`Edit ${title}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onEdit}
      >
        <PencilIcon className="size-3" />
      </Button>
    </>
  );
}
