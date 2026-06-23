"use client";

import { FolderInputIcon, PlusIcon, Trash2Icon, UngroupIcon } from "lucide-react";
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
  collectSelectedFieldIds,
  createEmptyField,
  createEmptyGroup,
  FIELD_TYPE_OPTIONS,
  type FieldBuilderBlock,
  type FieldBuilderValue,
  type FieldTypeValue,
  fieldTypeRequiresOptions,
  flattenBlocks,
  formatOptionsInput,
  MAX_KANBAN_CARD_FIELDS,
  parseOptionsInput,
  removeFieldsFromBlocks,
  reorderBlockFields,
} from "@/lib/campaign-types/fields";
import { fieldKeyFromLabel } from "@/lib/utils/slug";

interface FieldBuilderProps {
  blocks: FieldBuilderBlock[];
  onChange: (blocks: FieldBuilderBlock[]) => void;
  disabled?: boolean;
}

interface FieldCardProps {
  field: FieldBuilderValue;
  index: number;
  disabled?: boolean;
  selected: boolean;
  onSelectChange: (selected: boolean) => void;
  onChange: (patch: Partial<FieldBuilderValue>) => void;
  onRemove: () => void;
  onManualKeyChange: () => void;
  kanbanCardLimitReached: boolean;
}

function FieldCard({
  field,
  index,
  disabled,
  selected,
  onSelectChange,
  onChange,
  onRemove,
  onManualKeyChange,
  kanbanCardLimitReached,
}: FieldCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectChange(checked === true)}
            disabled={disabled}
            aria-label={`Select ${field.label || `field ${index + 1}`}`}
          />
          <Badge variant="secondary">Field {index + 1}</Badge>
          {field.required ? <Badge>Required</Badge> : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
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
            onChange={(event) => onChange({ label: event.target.value })}
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
              onManualKeyChange();
              onChange({ key: event.target.value });
            }}
            placeholder="full_name"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={field.fieldType}
            onValueChange={(value) => onChange({ fieldType: value as FieldTypeValue })}
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
              onCheckedChange={(checked) => onChange({ required: checked === true })}
              disabled={disabled}
            />
            Required field
          </Label>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox
              checked={field.showOnKanbanCard}
              onCheckedChange={(checked) => onChange({ showOnKanbanCard: checked === true })}
              disabled={disabled || (kanbanCardLimitReached && !field.showOnKanbanCard)}
            />
            Show on lead card
          </Label>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox
              checked={field.isUnique}
              onCheckedChange={(checked) => onChange({ isUnique: checked === true })}
              disabled={disabled}
            />
            Should be unique
          </Label>
        </div>
      </div>

      {fieldTypeRequiresOptions(field.fieldType) ? (
        <div className="mt-4 space-y-2">
          <Label htmlFor={`${field.clientId}-options`}>Options</Label>
          <Textarea
            id={`${field.clientId}-options`}
            value={formatOptionsInput(field.options)}
            onChange={(event) => onChange({ options: parseOptionsInput(event.target.value) })}
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
  );
}

function getBlockId(block: FieldBuilderBlock) {
  return block.type === "field" ? block.field.clientId : block.group.clientId;
}

function updateFieldInBlocks(
  blocks: FieldBuilderBlock[],
  clientId: string,
  patch: Partial<FieldBuilderValue>,
  manualKeys: Set<string>,
): FieldBuilderBlock[] {
  return blocks.map((block) => {
    if (block.type === "field") {
      if (block.field.clientId !== clientId) {
        return block;
      }

      const next = { ...block.field, ...patch };

      if ("label" in patch && patch.label !== undefined && !manualKeys.has(clientId)) {
        next.key = fieldKeyFromLabel(patch.label);
      }

      if ("fieldType" in patch && patch.fieldType && !fieldTypeRequiresOptions(patch.fieldType)) {
        next.options = [];
      }

      return { type: "field", field: next };
    }

    const fields = block.group.fields.map((field) => {
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
    });

    return { type: "group", group: { ...block.group, fields } };
  });
}

function removeFieldFromBlocks(blocks: FieldBuilderBlock[], clientId: string): FieldBuilderBlock[] {
  const next: FieldBuilderBlock[] = [];

  for (const block of blocks) {
    if (block.type === "field") {
      if (block.field.clientId !== clientId) {
        next.push(block);
      }
      continue;
    }

    const fields = block.group.fields.filter((field) => field.clientId !== clientId);

    if (fields.length === 0) {
      continue;
    }

    if (fields.length === 1) {
      next.push({ type: "field", field: fields[0] });
      continue;
    }

    next.push({ type: "group", group: { ...block.group, fields } });
  }

  return reorderBlockFields(next);
}

function findFirstSelectedBlockIndex(blocks: FieldBuilderBlock[], selectedIds: Set<string>) {
  return blocks.findIndex((block) => {
    if (block.type === "field") {
      return selectedIds.has(block.field.clientId);
    }

    return block.group.fields.some((field) => selectedIds.has(field.clientId));
  });
}

export function FieldBuilder({ blocks, onChange, disabled }: FieldBuilderProps) {
  const allFields = flattenBlocks(blocks);
  const [manualKeys, setManualKeys] = useState<Set<string>>(
    () => new Set(allFields.filter((field) => field.key).map((field) => field.clientId)),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const sortableBlocks = blocks.map((block) => ({ ...block, id: getBlockId(block) }));
  const selectedCount = selectedIds.size;
  const kanbanCardFieldCount = allFields.filter((field) => field.showOnKanbanCard).length;
  const kanbanCardLimitReached = kanbanCardFieldCount >= MAX_KANBAN_CARD_FIELDS;

  function updateBlocks(nextBlocks: FieldBuilderBlock[]) {
    onChange(reorderBlockFields(nextBlocks));
  }

  function updateField(clientId: string, patch: Partial<FieldBuilderValue>) {
    updateBlocks(updateFieldInBlocks(blocks, clientId, patch, manualKeys));
  }

  function removeField(clientId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(clientId);
      return next;
    });
    updateBlocks(removeFieldFromBlocks(blocks, clientId));
  }

  function addField() {
    updateBlocks([...blocks, { type: "field", field: createEmptyField(allFields.length) }]);
  }

  function toggleSelection(clientId: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(clientId);
      } else {
        next.delete(clientId);
      }
      return next;
    });
  }

  function groupSelectedFields() {
    const selectedFields = collectSelectedFieldIds(blocks, selectedIds);

    if (selectedFields.length < 2) {
      return;
    }

    const insertIndex = findFirstSelectedBlockIndex(blocks, selectedIds);
    const remaining = removeFieldsFromBlocks(blocks, selectedIds);
    const groupBlock: FieldBuilderBlock = {
      type: "group",
      group: createEmptyGroup(selectedFields),
    };

    const next =
      insertIndex === -1
        ? [...remaining, groupBlock]
        : [...remaining.slice(0, insertIndex), groupBlock, ...remaining.slice(insertIndex)];

    setSelectedIds(new Set());
    updateBlocks(next);
  }

  function ungroupBlock(groupClientId: string) {
    const next: FieldBuilderBlock[] = [];

    for (const block of blocks) {
      if (block.type === "group" && block.group.clientId === groupClientId) {
        for (const field of block.group.fields) {
          next.push({ type: "field", field });
        }
        continue;
      }

      next.push(block);
    }

    updateBlocks(next);
  }

  function updateGroup(groupClientId: string, label: string) {
    updateBlocks(
      blocks.map((block) => {
        if (block.type === "group" && block.group.clientId === groupClientId) {
          return { type: "group", group: { ...block.group, label } };
        }

        return block;
      }),
    );
  }

  function reorderGroupFields(groupClientId: string, fields: FieldBuilderValue[]) {
    updateBlocks(
      blocks.map((block) => {
        if (block.type === "group" && block.group.clientId === groupClientId) {
          return { type: "group", group: { ...block.group, fields } };
        }

        return block;
      }),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Custom fields</h2>
          <p className="text-muted-foreground text-sm">
            Define the data you collect for leads under this campaign type. Group related fields
            together, reorder groups, and choose up to {MAX_KANBAN_CARD_FIELDS} fields to show on
            kanban cards.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount >= 2 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={groupSelectedFields}
              disabled={disabled}
            >
              <FolderInputIcon />
              Group selected ({selectedCount})
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={addField} disabled={disabled}>
            <PlusIcon />
            Add field
          </Button>
        </div>
      </div>

      {blocks.length === 0 ? (
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
          items={sortableBlocks}
          disabled={disabled}
          contextId="field-builder-blocks"
          onReorder={(items) => {
            const blockMap = new Map(blocks.map((block) => [getBlockId(block), block]));
            const reordered = items
              .map((item) => blockMap.get(item.id))
              .filter((block): block is FieldBuilderBlock => block !== undefined);
            updateBlocks(reordered);
          }}
          renderItem={(block, blockIndex) => {
            if (block.type === "field") {
              return (
                <FieldCard
                  field={block.field}
                  index={blockIndex}
                  disabled={disabled}
                  selected={selectedIds.has(block.field.clientId)}
                  onSelectChange={(selected) => toggleSelection(block.field.clientId, selected)}
                  onChange={(patch) => updateField(block.field.clientId, patch)}
                  onRemove={() => removeField(block.field.clientId)}
                  onManualKeyChange={() =>
                    setManualKeys((current) => new Set(current).add(block.field.clientId))
                  }
                  kanbanCardLimitReached={kanbanCardLimitReached}
                />
              );
            }

            const sortableFields = block.group.fields.map((field) => ({
              ...field,
              id: field.clientId,
            }));

            return (
              <div className="rounded-xl border border-dashed bg-muted/20 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Badge variant="outline">Group {blockIndex + 1}</Badge>
                    <Input
                      value={block.group.label}
                      onChange={(event) => updateGroup(block.group.clientId, event.target.value)}
                      placeholder="Group label"
                      disabled={disabled}
                      className="max-w-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => ungroupBlock(block.group.clientId)}
                    disabled={disabled}
                  >
                    <UngroupIcon />
                    Ungroup
                  </Button>
                </div>

                <SortableList
                  items={sortableFields}
                  disabled={disabled}
                  contextId={`field-builder-group-${block.group.clientId}`}
                  onReorder={(items) => {
                    const fieldMap = new Map(
                      block.group.fields.map((field) => [field.clientId, field]),
                    );
                    const reordered = items
                      .map((item) => fieldMap.get(item.id))
                      .filter((field): field is FieldBuilderValue => field !== undefined);
                    reorderGroupFields(block.group.clientId, reordered);
                  }}
                  renderItem={(field, index) => (
                    <FieldCard
                      field={field}
                      index={index}
                      disabled={disabled}
                      selected={selectedIds.has(field.clientId)}
                      onSelectChange={(selected) => toggleSelection(field.clientId, selected)}
                      onChange={(patch) => updateField(field.clientId, patch)}
                      onRemove={() => removeField(field.clientId)}
                      onManualKeyChange={() =>
                        setManualKeys((current) => new Set(current).add(field.clientId))
                      }
                      kanbanCardLimitReached={kanbanCardLimitReached}
                    />
                  )}
                />
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
