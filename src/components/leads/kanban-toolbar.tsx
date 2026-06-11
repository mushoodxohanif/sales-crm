"use client";

import { ListFilterIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LeadFieldDefinition } from "@/lib/leads/field-values";
import {
  type CheckboxFilterValue,
  countActiveKanbanFilters,
  DEFAULT_KANBAN_FILTER_STATE,
  type FieldFilterValue,
  getKanbanSortOptions,
  type KanbanFilterState,
  type KanbanSortOption,
} from "@/lib/leads/kanban-filters";

const ANY_SELECT_VALUE = "__any__";

interface KanbanToolbarProps {
  fields: LeadFieldDefinition[];
  state: KanbanFilterState;
  onChange: (state: KanbanFilterState) => void;
}

function FieldFilterControl({
  field,
  value,
  onChange,
}: {
  field: LeadFieldDefinition;
  value: FieldFilterValue | undefined;
  onChange: (value: FieldFilterValue) => void;
}) {
  const currentValue = value ?? "";

  switch (field.fieldType) {
    case "TEXT":
    case "TEXTAREA":
    case "EMAIL":
    case "PHONE":
    case "URL":
      return (
        <Input
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Contains…`}
        />
      );

    case "NUMBER":
      return (
        <Input
          type="number"
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Equals…"
        />
      );

    case "DATE":
      return (
        <DatePicker
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={onChange}
          placeholder="Any date"
        />
      );

    case "SELECT":
    case "MULTI_SELECT":
      return (
        <Select
          value={typeof currentValue === "string" && currentValue ? currentValue : ANY_SELECT_VALUE}
          onValueChange={(nextValue) => onChange(nextValue === ANY_SELECT_VALUE ? "" : nextValue)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_SELECT_VALUE}>Any</SelectItem>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "CHECKBOX":
      return (
        <Select
          value={(currentValue as CheckboxFilterValue) || "all"}
          onValueChange={(nextValue) => onChange(nextValue as CheckboxFilterValue)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      );

    default:
      return null;
  }
}

export function KanbanToolbar({ fields, state, onChange }: KanbanToolbarProps) {
  const sortOptions = getKanbanSortOptions(fields);
  const activeFilterCount = countActiveKanbanFilters(state);
  const sortedFields = [...fields].sort((left, right) => left.sortOrder - right.sortOrder);

  function updateFieldFilter(fieldId: string, value: FieldFilterValue) {
    onChange({
      ...state,
      fieldFilters: {
        ...state.fieldFilters,
        [fieldId]: value,
      },
    });
  }

  function handleClearAll() {
    onChange(DEFAULT_KANBAN_FILTER_STATE);
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={state.search}
          onChange={(event) => onChange({ ...state, search: event.target.value })}
          placeholder="Search leads…"
          className="pl-8"
        />
      </div>

      <Select
        value={state.sort}
        onValueChange={(value) => onChange({ ...state, sort: value as KanbanSortOption })}
      >
        <SelectTrigger className="w-50">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <ListFilterIcon className="size-3.5" />
            Filters
            {activeFilterCount > 0 ? (
              <Badge variant="secondary" className="h-4 min-w-4 px-1">
                {activeFilterCount}
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="font-medium text-sm">Filters</p>
            {activeFilterCount > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={handleClearAll}>
                Clear all
              </Button>
            ) : null}
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto p-3">
            {sortedFields.length === 0 ? (
              <p className="text-muted-foreground text-sm">No custom fields to filter by.</p>
            ) : (
              sortedFields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label htmlFor={`kanban-filter-${field.id}`} className="text-xs">
                    {field.label}
                  </Label>
                  <FieldFilterControl
                    field={field}
                    value={state.fieldFilters[field.id]}
                    onChange={(value) => updateFieldFilter(field.id, value)}
                  />
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
