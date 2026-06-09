"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DynamicFieldList, type DynamicFieldValue } from "@/components/leads/dynamic-field-input";
import { Button } from "@/components/ui/button";
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

interface LeadStageOption {
  id: string;
  name: string;
  isDefault: boolean;
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
      router.push(`/campaigns/${campaignId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
        <div>
          <h2 className="text-base font-medium">{leadId ? "Edit lead" : "New lead"}</h2>
          <p className="text-muted-foreground text-sm">
            {leadId
              ? `Update lead details for ${campaignName}.`
              : `Add a lead to ${campaignName} using this campaign type's field schema.`}
          </p>
        </div>

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

        <DynamicFieldList
          fields={fields}
          values={values}
          onChange={handleFieldChange}
          disabled={disabled || isPending}
        />
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" disabled={isPending} asChild>
          <Link href={`/campaigns/${campaignId}`}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={disabled || isPending || !currentStageId}>
          {isPending ? "Saving..." : leadId ? "Save changes" : "Create lead"}
        </Button>
      </div>
    </form>
  );
}
