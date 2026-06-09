"use client";

import type { LeadKanbanLead } from "@/components/leads/lead-card";
import { LeadForm } from "@/components/leads/lead-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fieldValuesToMap,
  getLeadDisplayTitle,
  type LeadFieldDefinition,
} from "@/lib/leads/field-values";

interface LeadStageOption {
  id: string;
  name: string;
  isDefault: boolean;
}

interface LeadEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  fields: LeadFieldDefinition[];
  stages: LeadStageOption[];
  lead: LeadKanbanLead | null;
  disabled?: boolean;
}

export function LeadEditDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  fields,
  stages,
  lead,
  disabled = false,
}: LeadEditDialogProps) {
  if (!lead) {
    return null;
  }

  const title = getLeadDisplayTitle(fields, lead.fieldValues);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Edit lead details for {campaignName}.</DialogDescription>
        </DialogHeader>

        <LeadForm
          campaignId={campaignId}
          campaignName={campaignName}
          fields={fields}
          stages={stages}
          initialStageId={lead.currentStageId}
          initialValues={fieldValuesToMap(lead.fieldValues)}
          leadId={lead.id}
          disabled={disabled}
          layout="dialog"
          onSaved={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
