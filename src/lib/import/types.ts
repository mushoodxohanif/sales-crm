import type { FieldType } from "@/generated/prisma/client";

export type ParsedRow = Record<string, string>;

export type ParsedFileData = {
  headers: string[];
  rows: ParsedRow[];
  previewRows: ParsedRow[];
};

export type InferredField = {
  key: string;
  label: string;
  fieldType: FieldType;
  sourceColumn: string;
  required: boolean;
  options?: string[];
};

export type ImportAnalysis = {
  parsed: ParsedFileData;
  suggestedTypeName: string;
  fields: InferredField[];
  usedAI: boolean;
};

export type MatchScore = "full" | "partial" | "none";

export type TypeMatch = {
  campaignTypeId: string;
  campaignTypeName: string;
  score: MatchScore;
  mappedFields: number;
  totalFields: number;
  missingRequired: string[];
  columnMappings: Record<string, string>;
  campaigns: Array<{ id: string; name: string }>;
  confidence?: number;
};

export type ImportMatchResult = {
  typeMatches: TypeMatch[];
  bestMatch: TypeMatch | null;
};

export type ImportDestination =
  | { mode: "existing_campaign"; campaignTypeId: string; campaignId: string }
  | { mode: "new_campaign"; campaignTypeId: string; campaignName: string }
  | {
      mode: "new_type";
      typeName: string;
      typeSlug: string;
      campaignName: string;
    };

export type ColumnMapping = {
  sourceColumn: string;
  fieldKey: string | null;
};

export type ImportMapping = {
  destination: ImportDestination;
  fields: InferredField[];
  columnMappings: ColumnMapping[];
};

export type ImportPreviewRow = {
  rowIndex: number;
  values: Record<string, string | number | boolean | string[] | null>;
};
