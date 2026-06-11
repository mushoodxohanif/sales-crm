import type { LeadKanbanLead, LeadKanbanStage } from "@/components/leads/lead-card";
import type { FieldTypeValue } from "@/lib/campaign-types/fields";
import { getKanbanCardFields, type LeadFieldDefinition } from "@/lib/leads/field-values";

export type SemanticField = "name" | "designation" | "company";

export type KanbanSortOption =
  | "updatedAt_desc"
  | "name_asc"
  | "name_desc"
  | "designation_asc"
  | "designation_desc"
  | "company_asc"
  | "company_desc"
  | "createdAt_asc"
  | "createdAt_desc";

export type CheckboxFilterValue = "all" | "yes" | "no";

export type FieldFilterValue = string | CheckboxFilterValue;

export type KanbanFilterState = {
  search: string;
  sort: KanbanSortOption;
  fieldFilters: Record<string, FieldFilterValue>;
};

export const DEFAULT_KANBAN_FILTER_STATE: KanbanFilterState = {
  search: "",
  sort: "updatedAt_desc",
  fieldFilters: {},
};

const SEMANTIC_FIELD_CONFIG: Record<
  SemanticField,
  { keys: readonly string[]; labels: readonly string[] }
> = {
  name: {
    keys: ["full_name", "name", "prospect_name", "contact_name"],
    labels: ["full name", "name", "prospect name", "contact name"],
  },
  designation: {
    keys: ["job_title", "designation"],
    labels: ["designation", "job title"],
  },
  company: {
    keys: ["company", "company_name"],
    labels: ["company", "company name"],
  },
};

const KANBAN_SORT_LABELS: Record<KanbanSortOption, string> = {
  updatedAt_desc: "Recently updated",
  name_asc: "Name (A → Z)",
  name_desc: "Name (Z → A)",
  designation_asc: "Designation (A → Z)",
  designation_desc: "Designation (Z → A)",
  company_asc: "Company (A → Z)",
  company_desc: "Company (Z → A)",
  createdAt_asc: "Days in pipeline (oldest)",
  createdAt_desc: "Days in pipeline (newest)",
};

const TEXT_FILTER_TYPES: FieldTypeValue[] = ["TEXT", "TEXTAREA", "EMAIL", "PHONE", "URL"];

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function getLeadFieldValue(lead: LeadKanbanLead, fieldId: string): unknown {
  return lead.fieldValues.find((fieldValue) => fieldValue.fieldId === fieldId)?.value;
}

function isEmptyFilterValue(value: FieldFilterValue | undefined): boolean {
  if (value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0 || value === "all";
  }

  return false;
}

function getStringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return "";
}

function normalizeDateValue(value: unknown): string {
  const stringValue = getStringValue(value).trim();

  if (!stringValue) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return stringValue;
  }

  const parsed = new Date(stringValue);

  if (Number.isNaN(parsed.getTime())) {
    return stringValue;
  }

  return parsed.toISOString().slice(0, 10);
}

function parseNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.trim());

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function compareUpdatedAtDesc(left: LeadKanbanLead, right: LeadKanbanLead): number {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

function getCreatedAtTimestamp(lead: LeadKanbanLead): number {
  const timestamp = new Date(lead.createdAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function resolveSemanticField(
  fields: LeadFieldDefinition[],
  semantic: SemanticField,
): LeadFieldDefinition | undefined {
  const config = SEMANTIC_FIELD_CONFIG[semantic];

  return fields.find(
    (field) =>
      config.keys.includes(normalizeKey(field.key)) ||
      config.labels.includes(normalizeLabel(field.label)),
  );
}

export function getKanbanSortOptions(
  fields: LeadFieldDefinition[],
): Array<{ value: KanbanSortOption; label: string }> {
  const options: Array<{ value: KanbanSortOption; label: string }> = [
    { value: "updatedAt_desc", label: KANBAN_SORT_LABELS.updatedAt_desc },
    { value: "createdAt_asc", label: KANBAN_SORT_LABELS.createdAt_asc },
    { value: "createdAt_desc", label: KANBAN_SORT_LABELS.createdAt_desc },
  ];

  if (resolveSemanticField(fields, "name")) {
    options.push(
      { value: "name_asc", label: KANBAN_SORT_LABELS.name_asc },
      { value: "name_desc", label: KANBAN_SORT_LABELS.name_desc },
    );
  }

  if (resolveSemanticField(fields, "designation")) {
    options.push(
      { value: "designation_asc", label: KANBAN_SORT_LABELS.designation_asc },
      { value: "designation_desc", label: KANBAN_SORT_LABELS.designation_desc },
    );
  }

  if (resolveSemanticField(fields, "company")) {
    options.push(
      { value: "company_asc", label: KANBAN_SORT_LABELS.company_asc },
      { value: "company_desc", label: KANBAN_SORT_LABELS.company_desc },
    );
  }

  return options;
}

export function getSemanticFieldStringValue(
  lead: LeadKanbanLead,
  field: LeadFieldDefinition | undefined,
): string {
  if (!field) {
    return "";
  }

  return getStringValue(getLeadFieldValue(lead, field.id)).trim();
}

function getKanbanSearchFields(fields: LeadFieldDefinition[]): LeadFieldDefinition[] {
  const seen = new Set<string>();
  const searchFields: LeadFieldDefinition[] = [];

  for (const semantic of ["name", "designation", "company"] as const) {
    const field = resolveSemanticField(fields, semantic);

    if (field && !seen.has(field.id)) {
      seen.add(field.id);
      searchFields.push(field);
    }
  }

  for (const field of getKanbanCardFields(fields)) {
    if (!seen.has(field.id)) {
      seen.add(field.id);
      searchFields.push(field);
    }
  }

  return searchFields;
}

export function matchesKanbanSearch(
  lead: LeadKanbanLead,
  fields: LeadFieldDefinition[],
  search: string,
): boolean {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const searchFields = getKanbanSearchFields(fields);

  if (searchFields.length === 0) {
    return fields.some(
      (field) =>
        TEXT_FILTER_TYPES.includes(field.fieldType) &&
        getStringValue(getLeadFieldValue(lead, field.id)).toLowerCase().includes(query),
    );
  }

  return searchFields.some((field) =>
    getStringValue(getLeadFieldValue(lead, field.id)).toLowerCase().includes(query),
  );
}

function matchesTextContainsFilter(
  lead: LeadKanbanLead,
  field: LeadFieldDefinition,
  filter: string,
) {
  const query = filter.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return getStringValue(getLeadFieldValue(lead, field.id)).toLowerCase().includes(query);
}

function matchesNumberEqualsFilter(
  lead: LeadKanbanLead,
  field: LeadFieldDefinition,
  filter: string,
) {
  const expected = parseNumberValue(filter);
  const actual = parseNumberValue(getLeadFieldValue(lead, field.id));

  if (expected === null) {
    return true;
  }

  return actual === expected;
}

function matchesDateEqualsFilter(lead: LeadKanbanLead, field: LeadFieldDefinition, filter: string) {
  const expected = filter.trim();

  if (!expected) {
    return true;
  }

  return normalizeDateValue(getLeadFieldValue(lead, field.id)) === expected;
}

function matchesSelectFilter(lead: LeadKanbanLead, field: LeadFieldDefinition, filter: string) {
  const expected = filter.trim();

  if (!expected) {
    return true;
  }

  return getStringValue(getLeadFieldValue(lead, field.id)).trim() === expected;
}

function matchesMultiSelectFilter(
  lead: LeadKanbanLead,
  field: LeadFieldDefinition,
  filter: string,
) {
  const expected = filter.trim();

  if (!expected) {
    return true;
  }

  const value = getLeadFieldValue(lead, field.id);

  if (!Array.isArray(value)) {
    return false;
  }

  return value.includes(expected);
}

function matchesCheckboxFilter(
  lead: LeadKanbanLead,
  field: LeadFieldDefinition,
  filter: FieldFilterValue,
) {
  if (filter === "all" || (typeof filter === "string" && filter.trim() === "")) {
    return true;
  }

  const value = getLeadFieldValue(lead, field.id) === true;

  if (filter === "yes") {
    return value;
  }

  if (filter === "no") {
    return !value;
  }

  return true;
}

export function matchesFieldFilter(
  lead: LeadKanbanLead,
  field: LeadFieldDefinition,
  filter: FieldFilterValue,
): boolean {
  if (isEmptyFilterValue(filter)) {
    return true;
  }

  if (field.fieldType === "CHECKBOX") {
    return matchesCheckboxFilter(lead, field, filter);
  }

  if (typeof filter !== "string") {
    return true;
  }

  if (TEXT_FILTER_TYPES.includes(field.fieldType)) {
    return matchesTextContainsFilter(lead, field, filter);
  }

  switch (field.fieldType) {
    case "NUMBER":
      return matchesNumberEqualsFilter(lead, field, filter);
    case "DATE":
      return matchesDateEqualsFilter(lead, field, filter);
    case "SELECT":
      return matchesSelectFilter(lead, field, filter);
    case "MULTI_SELECT":
      return matchesMultiSelectFilter(lead, field, filter);
    default:
      return true;
  }
}

export function matchesAllFieldFilters(
  lead: LeadKanbanLead,
  fields: LeadFieldDefinition[],
  fieldFilters: Record<string, FieldFilterValue>,
): boolean {
  for (const field of fields) {
    const filter = fieldFilters[field.id];

    if (isEmptyFilterValue(filter)) {
      continue;
    }

    if (!matchesFieldFilter(lead, field, filter)) {
      return false;
    }
  }

  return true;
}

function compareBySortOption(
  left: LeadKanbanLead,
  right: LeadKanbanLead,
  fields: LeadFieldDefinition[],
  sort: KanbanSortOption,
): number {
  switch (sort) {
    case "updatedAt_desc":
      return compareUpdatedAtDesc(left, right);
    case "name_asc":
    case "name_desc": {
      const field = resolveSemanticField(fields, "name");
      const comparison = compareStrings(
        getSemanticFieldStringValue(left, field),
        getSemanticFieldStringValue(right, field),
      );
      return sort === "name_asc" ? comparison : -comparison;
    }
    case "designation_asc":
    case "designation_desc": {
      const field = resolveSemanticField(fields, "designation");
      const comparison = compareStrings(
        getSemanticFieldStringValue(left, field),
        getSemanticFieldStringValue(right, field),
      );
      return sort === "designation_asc" ? comparison : -comparison;
    }
    case "company_asc":
    case "company_desc": {
      const field = resolveSemanticField(fields, "company");
      const comparison = compareStrings(
        getSemanticFieldStringValue(left, field),
        getSemanticFieldStringValue(right, field),
      );
      return sort === "company_asc" ? comparison : -comparison;
    }
    case "createdAt_asc":
      return getCreatedAtTimestamp(left) - getCreatedAtTimestamp(right);
    case "createdAt_desc":
      return getCreatedAtTimestamp(right) - getCreatedAtTimestamp(left);
    default:
      return compareUpdatedAtDesc(left, right);
  }
}

export function sortKanbanLeads(
  leads: LeadKanbanLead[],
  fields: LeadFieldDefinition[],
  sort: KanbanSortOption,
): LeadKanbanLead[] {
  return [...leads].sort((left, right) => {
    const primary = compareBySortOption(left, right, fields, sort);

    if (primary !== 0) {
      return primary;
    }

    return compareUpdatedAtDesc(left, right);
  });
}

export function applyKanbanFilters(
  stages: LeadKanbanStage[],
  fields: LeadFieldDefinition[],
  state: KanbanFilterState,
): LeadKanbanStage[] {
  return stages.map((stage) => ({
    ...stage,
    leads: sortKanbanLeads(
      stage.leads.filter(
        (lead) =>
          matchesKanbanSearch(lead, fields, state.search) &&
          matchesAllFieldFilters(lead, fields, state.fieldFilters),
      ),
      fields,
      state.sort,
    ),
  }));
}

export function getFilteredLeadCount(stages: LeadKanbanStage[]): number {
  return stages.reduce((count, stage) => count + stage.leads.length, 0);
}

export function countActiveKanbanFilters(state: KanbanFilterState): number {
  let count = state.search.trim().length > 0 ? 1 : 0;

  for (const value of Object.values(state.fieldFilters)) {
    if (!isEmptyFilterValue(value)) {
      count += 1;
    }
  }

  return count;
}

export function hasActiveKanbanFilters(state: KanbanFilterState): boolean {
  return countActiveKanbanFilters(state) > 0;
}

export function getDaysSinceCreation(createdAt: string): number {
  const timestamp = new Date(createdAt).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.floor((Date.now() - timestamp) / 86_400_000);
}
