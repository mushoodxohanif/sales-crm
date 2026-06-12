"use client";

import { ClockIcon } from "lucide-react";
import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
import { IcpEvaluationPanel } from "@/components/leads/icp-evaluation-panel";
import { LeadActivityPanel } from "@/components/leads/lead-activity-panel";
import type { LeadKanbanLead } from "@/components/leads/lead-card";
import { LeadForm } from "@/components/leads/lead-form";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { LeadIcpEvaluationClient } from "@/lib/actions/icp";
import {
  fieldValuesToMap,
  getLeadDisplayTitle,
  type LeadFieldDefinition,
} from "@/lib/leads/field-values";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";

interface LeadStageOption {
  id: string;
  name: string;
  isDefault: boolean;
  color?: string | null;
}

interface LeadDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  fields: LeadFieldDefinition[];
  stages: LeadStageOption[];
  lead: LeadKanbanLead | null;
  disabled?: boolean;
  focusCommentsOnOpen?: boolean;
  onLeadDeleted?: (leadId: string) => void;
  onIcpEvaluated?: (leadId: string, evaluation: LeadIcpEvaluationClient) => void;
}

export function LeadDetailDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  fields,
  stages,
  lead,
  disabled = false,
  focusCommentsOnOpen = false,
  onLeadDeleted,
  onIcpEvaluated,
}: LeadDetailDialogProps) {
  if (!lead) {
    return null;
  }

  const title = getLeadDisplayTitle(fields, lead.fieldValues);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(90vh,820px)] max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton
      >
        <div className="flex shrink-0 items-center border-b px-4 py-2.5 pr-12">
          <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
            <span className="truncate">{campaignName}</span>
            <span className="text-border">/</span>
            <span className="truncate text-foreground">Lead</span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-b lg:border-r lg:border-b-0">
            <div className="shrink-0 space-y-3 px-6 pt-5 pb-4">
              <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-normal">
                Lead
              </Badge>
              <div className="space-y-1">
                <h2 className="font-semibold text-2xl leading-tight tracking-tight">{title}</h2>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <ClockIcon className="size-3.5 shrink-0" />
                  <span>Updated {formatRelativeTime(lead.updatedAt)}</span>
                  {lead.commentCount && lead.commentCount > 0 ? (
                    <span className="text-border">·</span>
                  ) : null}
                  {lead.commentCount && lead.commentCount > 0 ? (
                    <span>{lead.commentCount} comments</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="shrink-0 px-6">
              <IcpEvaluationPanel
                leadId={lead.id}
                initialEvaluation={lead.icpEvaluation}
                disabled={disabled}
                onEvaluated={(evaluation) => onIcpEvaluated?.(lead.id, evaluation)}
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-6">
              <LeadForm
                campaignId={campaignId}
                campaignName={campaignName}
                fields={fields}
                stages={stages}
                initialStageId={lead.currentStageId}
                initialValues={fieldValuesToMap(lead.fieldValues)}
                leadId={lead.id}
                disabled={disabled}
                layout="detail"
                footerLeading={
                  <DeleteLeadButton
                    leadId={lead.id}
                    campaignId={campaignId}
                    leadTitle={title}
                    disabled={disabled}
                    size="sm"
                    onDeleted={() => {
                      onLeadDeleted?.(lead.id);
                      onOpenChange(false);
                    }}
                  />
                }
                onSaved={() => onOpenChange(false)}
              />
            </div>
          </div>

          <div className="flex min-h-[280px] w-full shrink-0 flex-col bg-muted/20 lg:min-h-0 lg:w-[380px]">
            <LeadActivityPanel
              leadId={lead.id}
              active={open}
              disabled={disabled}
              autoFocusInput={focusCommentsOnOpen}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
