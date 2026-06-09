"use client";

import { GripVerticalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { moveLeadToStage } from "@/lib/actions/leads";
import {
  formatFieldValueForDisplay,
  getLeadDisplayTitle,
  type LeadFieldDefinition,
} from "@/lib/leads/field-values";
import { cn } from "@/lib/utils";

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
  leads: LeadKanbanLead[];
}

interface LeadCardProps {
  campaignId: string;
  fields: LeadFieldDefinition[];
  stages: Array<{ id: string; name: string }>;
  lead: LeadKanbanLead;
  disabled?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function LeadCard({
  campaignId,
  fields,
  stages,
  lead,
  disabled = false,
  dragHandleProps,
}: LeadCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const title = getLeadDisplayTitle(fields, lead.fieldValues);
  const previewFields = fields.filter((field) => field.required).slice(0, 2);
  const displayFields = previewFields.length > 0 ? previewFields : fields.slice(0, 2);
  const valueByFieldId = new Map(
    lead.fieldValues.map((fieldValue) => [fieldValue.fieldId, fieldValue.value]),
  );

  function handleStageChange(stageId: string | null) {
    if (!stageId || stageId === lead.currentStageId) {
      return;
    }

    startTransition(async () => {
      const result = await moveLeadToStage({
        leadId: lead.id,
        stageId,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Lead moved");
      router.refresh();
    });
  }

  return (
    <article className="space-y-3 rounded-lg border bg-background p-3 shadow-xs">
      <div className="flex items-start gap-2">
        {dragHandleProps ? (
          <button
            type="button"
            className={cn(
              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
              disabled && "pointer-events-none opacity-50",
            )}
            aria-label="Drag lead"
            {...dragHandleProps}
          >
            <GripVerticalIcon className="size-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            href={`/campaigns/${campaignId}/leads/${lead.id}`}
            className="font-medium text-sm hover:underline"
          >
            {title}
          </Link>
          {displayFields.map((field) => (
            <p key={field.id} className="text-muted-foreground truncate text-xs">
              {field.label}: {formatFieldValueForDisplay(valueByFieldId.get(field.id))}
            </p>
          ))}
        </div>
      </div>

      <Select
        value={lead.currentStageId}
        onValueChange={handleStageChange}
        disabled={disabled || isPending}
      >
        <SelectTrigger className="w-full" size="sm">
          <SelectValue placeholder="Move to stage" />
        </SelectTrigger>
        <SelectContent>
          {stages.map((stage) => (
            <SelectItem key={stage.id} value={stage.id}>
              {stage.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </article>
  );
}
