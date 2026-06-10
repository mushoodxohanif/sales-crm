"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DynamicFieldList, type DynamicFieldValue } from "@/components/leads/dynamic-field-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLead, updateLead } from "@/lib/actions/leads";
import { type LeadFieldDefinition, mapToFieldValues } from "@/lib/leads/field-values";
import { cn } from "@/lib/utils";

interface LeadStageOption {
  id: string;
  name: string;
  isDefault: boolean;
  color?: string | null;
}

interface LeadFormProps {
  campaignId: string;
  campaignName: string;
  fields: LeadFieldDefinition[];
  stages: LeadStageOption[];
  initialStageId?: string;
  initialValues?: Record<string, DynamicFieldValue>;
  leadId?: string;
  disabled?: boolean;
  layout?: "page" | "dialog" | "detail";
  footerLeading?: React.ReactNode;
  onSaved?: () => void;
  onCancel?: () => void;
}

function buildInitialValues(
  fields: LeadFieldDefinition[],
  initialValues?: Record<string, DynamicFieldValue>,
): Record<string, DynamicFieldValue> {
  const values: Record<string, DynamicFieldValue> = {};

  for (const field of fields) {
    if (initialValues && field.id in initialValues) {
      values[field.id] = initialValues[field.id] ?? null;
      continue;
    }

    values[field.id] = field.fieldType === "CHECKBOX" ? false : null;
  }

  return values;
}

function resolveInitialStageId(stages: LeadStageOption[], initialStageId?: string) {
  if (initialStageId) {
    return initialStageId;
  }

  return stages.find((stage) => stage.isDefault)?.id ?? stages[0]?.id ?? "";
}

export function LeadForm({
  campaignId,
  campaignName,
  fields,
  stages,
  initialStageId,
  initialValues,
  leadId,
  disabled = false,
  layout = "page",
  footerLeading,
  onSaved,
  onCancel,
}: LeadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(() => buildInitialValues(fields, initialValues));
  const [currentStageId, setCurrentStageId] = useState(() =>
    resolveInitialStageId(stages, initialStageId),
  );

  function handleFieldChange(fieldId: string, value: DynamicFieldValue) {
    setValues((current) => ({
      ...current,
      [fieldId]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const fieldValues = mapToFieldValues(fields, values);
      const result = leadId
        ? await updateLead({
            id: leadId,
            currentStageId,
            fieldValues,
          })
        : await createLead({
            campaignId,
            currentStageId,
            fieldValues,
          });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(leadId ? "Lead updated" : "Lead created");
      router.refresh();

      if (layout === "dialog") {
        onSaved?.();
        return;
      }

      router.push(`/campaigns/${campaignId}`);
    });
  }

  const isDialog = layout === "dialog";
  const isDetail = layout === "detail";
  const currentStage = stages.find((stage) => stage.id === currentStageId);
  const currentStageColor = currentStage?.color ?? "#6366f1";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        isDetail ? "flex min-h-0 flex-1 flex-col" : isDialog ? "space-y-4" : "space-y-8",
      )}
    >
      <section
        className={cn(
          isDetail ? "min-h-0 flex-1 space-y-6 overflow-y-auto" : "space-y-4",
          !isDialog && !isDetail && "rounded-xl border bg-card p-6 shadow-xs",
        )}
      >
        {!isDialog && !isDetail ? (
          <div>
            <h2 className="text-base font-medium">{leadId ? "Edit lead" : "New lead"}</h2>
            <p className="text-muted-foreground text-sm">
              {leadId
                ? `Update lead details for ${campaignName}.`
                : `Add a lead to ${campaignName} using this campaign type's field schema.`}
            </p>
          </div>
        ) : null}

        {isDetail ? (
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-muted-foreground text-xs">Stage</span>
              <Select
                value={currentStageId}
                onValueChange={(value) => setCurrentStageId(value ?? "")}
                disabled={disabled || isPending || stages.length === 0}
              >
                <SelectTrigger
                  id="lead-stage"
                  className="h-7 w-fit max-w-full gap-2 border-transparent bg-transparent px-2 shadow-none hover:bg-muted/60"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: currentStageColor }}
                  />
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                      {stage.isDefault ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="lead-stage">Pipeline stage</Label>
            <Select
              value={currentStageId}
              onValueChange={(value) => setCurrentStageId(value ?? "")}
              disabled={disabled || isPending || stages.length === 0}
            >
              <SelectTrigger id="lead-stage" className="w-full max-w-sm">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                    {stage.isDefault ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isDetail ? (
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Details</h3>
            <DynamicFieldList
              fields={fields}
              values={values}
              onChange={handleFieldChange}
              disabled={disabled || isPending}
              compact
            />
          </div>
        ) : (
          <DynamicFieldList
            fields={fields}
            values={values}
            onChange={handleFieldChange}
            disabled={disabled || isPending}
          />
        )}
      </section>

      <div
        className={cn(
          "flex items-center justify-end gap-3",
          isDetail && "-mx-6 shrink-0 border-t bg-background/80 px-6 py-4",
        )}
      >
        {isDialog ? (
          <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
            Cancel
          </Button>
        ) : isDetail ? (
          footerLeading
        ) : (
          <Link
            href={`/campaigns/${campaignId}`}
            aria-disabled={isPending || undefined}
            tabIndex={isPending ? -1 : undefined}
            className={cn(
              buttonVariants({ variant: "outline" }),
              isPending && "pointer-events-none opacity-50",
            )}
          >
            Cancel
          </Link>
        )}
        <Button type="submit" disabled={disabled || isPending || !currentStageId}>
          {isPending ? "Saving..." : leadId ? "Save changes" : "Create lead"}
        </Button>
      </div>
    </form>
  );
}
