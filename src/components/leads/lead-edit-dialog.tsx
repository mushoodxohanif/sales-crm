"use client";

import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
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
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>Edit lead details for {campaignName}.</DialogDescription>
            </div>
            <DeleteLeadButton
              leadId={lead.id}
              campaignId={campaignId}
              leadTitle={title}
              disabled={disabled}
              size="sm"
              onDeleted={() => onOpenChange(false)}
            />
          </div>
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
