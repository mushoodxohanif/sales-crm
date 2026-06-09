"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortableList } from "@/components/ui/sortable-list";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyField,
  FIELD_TYPE_OPTIONS,
  type FieldBuilderValue,
  type FieldTypeValue,
  fieldTypeRequiresOptions,
  formatOptionsInput,
  MAX_KANBAN_CARD_FIELDS,
  parseOptionsInput,
} from "@/lib/campaign-types/fields";
import { fieldKeyFromLabel } from "@/lib/utils/slug";

interface FieldBuilderProps {
  fields: FieldBuilderValue[];
  onChange: (fields: FieldBuilderValue[]) => void;
  disabled?: boolean;
}

function reorderFields(fields: FieldBuilderValue[]) {
  return fields.map((field, index) => ({ ...field, sortOrder: index }));
}

export function FieldBuilder({ fields, onChange, disabled }: FieldBuilderProps) {
  const [manualKeys, setManualKeys] = useState<Set<string>>(
    () => new Set(fields.filter((field) => field.key).map((field) => field.clientId)),
  );

  const sortableFields = fields.map((field) => ({ ...field, id: field.clientId }));

  function updateField(clientId: string, patch: Partial<FieldBuilderValue>) {
    onChange(
      fields.map((field) => {
        if (field.clientId !== clientId) {
          return field;
        }

        const next = { ...field, ...patch };

        if ("label" in patch && patch.label !== undefined && !manualKeys.has(clientId)) {
          next.key = fieldKeyFromLabel(patch.label);
        }

        if ("fieldType" in patch && patch.fieldType && !fieldTypeRequiresOptions(patch.fieldType)) {
          next.options = [];
        }

        return next;
      }),
    );
  }

  function removeField(clientId: string) {
    onChange(reorderFields(fields.filter((field) => field.clientId !== clientId)));
  }

  function addField() {
    onChange(reorderFields([...fields, createEmptyField(fields.length)]));
  }

  const kanbanCardFieldCount = fields.filter((field) => field.showOnKanbanCard).length;
  const kanbanCardLimitReached = kanbanCardFieldCount >= MAX_KANBAN_CARD_FIELDS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Custom fields</h2>
          <p className="text-muted-foreground text-sm">
            Define the data you collect for leads under this campaign type. Choose up to{" "}
            {MAX_KANBAN_CARD_FIELDS} fields to show on kanban cards.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addField} disabled={disabled}>
          <PlusIcon />
          Add field
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No fields yet. Add fields to define what information each lead should capture.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={addField}
            disabled={disabled}
          >
            <PlusIcon />
            Add your first field
          </Button>
        </div>
      ) : (
        <SortableList
          items={sortableFields}
          disabled={disabled}
          onReorder={(items) => {
            const fieldMap = new Map(fields.map((field) => [field.clientId, field]));
            const reordered = items
              .map((item) => fieldMap.get(item.id))
              .filter((field): field is FieldBuilderValue => field !== undefined);
            onChange(reorderFields(reordered));
          }}
          renderItem={(field, index) => (
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Field {index + 1}</Badge>
                  {field.required ? <Badge>Required</Badge> : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeField(field.clientId)}
                  disabled={disabled}
                  aria-label="Remove field"
                >
                  <Trash2Icon />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${field.clientId}-label`}>Label</Label>
                  <Input
                    id={`${field.clientId}-label`}
                    value={field.label}
                    onChange={(event) => updateField(field.clientId, { label: event.target.value })}
                    placeholder="Full Name"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${field.clientId}-key`}>Key</Label>
                  <Input
                    id={`${field.clientId}-key`}
                    value={field.key}
                    onChange={(event) => {
                      setManualKeys((current) => new Set(current).add(field.clientId));
                      updateField(field.clientId, { key: event.target.value });
                    }}
                    placeholder="full_name"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={field.fieldType}
                    onValueChange={(value) =>
                      updateField(field.clientId, { fieldType: value as FieldTypeValue })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <Label className="flex items-center gap-2 font-normal">
                    <Checkbox
                      checked={field.required}
                      onCheckedChange={(checked) =>
                        updateField(field.clientId, { required: checked === true })
                      }
                      disabled={disabled}
                    />
                    Required field
                  </Label>
                  <Label className="flex items-center gap-2 font-normal">
                    <Checkbox
                      checked={field.showOnKanbanCard}
                      onCheckedChange={(checked) =>
                        updateField(field.clientId, { showOnKanbanCard: checked === true })
                      }
                      disabled={disabled || (kanbanCardLimitReached && !field.showOnKanbanCard)}
                    />
                    Show on kanban card
                  </Label>
                </div>
              </div>

              {fieldTypeRequiresOptions(field.fieldType) ? (
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`${field.clientId}-options`}>Options</Label>
                  <Textarea
                    id={`${field.clientId}-options`}
                    value={formatOptionsInput(field.options)}
                    onChange={(event) =>
                      updateField(field.clientId, {
                        options: parseOptionsInput(event.target.value),
                      })
                    }
                    placeholder={"Option one\nOption two"}
                    disabled={disabled}
                    rows={3}
                  />
                  <p className="text-muted-foreground text-xs">
                    Enter one option per line or separate with commas.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        />
      )}
    </div>
  );
}
