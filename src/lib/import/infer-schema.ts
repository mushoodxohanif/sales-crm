import { FieldType } from "@/generated/prisma/client";
import { analyzeImportWithAI } from "@/lib/ai/import-analysis";
import { fieldKeyFromLabel } from "@/lib/utils/slug";
import { headerToFieldKey, normalizeHeader } from "./parse-file";
import type { InferredField, ParsedRow } from "./types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\//i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^[+()\d\s.-]{7,}$/;

function inferFieldTypeFromSamples(samples: string[]): FieldType {
  const nonEmpty = samples.map((value) => value.trim()).filter(Boolean);

  if (nonEmpty.length === 0) {
    return FieldType.TEXT;
  }

  const emailHits = nonEmpty.filter((value) => EMAIL_REGEX.test(value)).length;
  if (emailHits / nonEmpty.length >= 0.8) {
    return FieldType.EMAIL;
  }

  const urlHits = nonEmpty.filter(
    (value) => URL_REGEX.test(value) || value.includes("linkedin.com"),
  ).length;
  if (urlHits / nonEmpty.length >= 0.6) {
    return FieldType.URL;
  }

  const phoneHits = nonEmpty.filter((value) => PHONE_REGEX.test(value)).length;
  if (phoneHits / nonEmpty.length >= 0.7) {
    return FieldType.PHONE;
  }

  const dateHits = nonEmpty.filter((value) => DATE_REGEX.test(value)).length;
  if (dateHits / nonEmpty.length >= 0.7) {
    return FieldType.DATE;
  }

  const numberHits = nonEmpty.filter((value) => !Number.isNaN(Number(value))).length;
  if (numberHits / nonEmpty.length >= 0.8) {
    return FieldType.NUMBER;
  }

  const uniqueValues = new Set(nonEmpty.map((value) => value.toLowerCase()));
  if (uniqueValues.size <= 12 && uniqueValues.size / nonEmpty.length <= 0.5) {
    return FieldType.SELECT;
  }

  const longTextHits = nonEmpty.filter((value) => value.length > 120).length;
  if (longTextHits / nonEmpty.length >= 0.4) {
    return FieldType.TEXTAREA;
  }

  return FieldType.TEXT;
}

function collectSelectOptions(samples: string[]): string[] {
  const options = new Set<string>();

  for (const sample of samples) {
    const value = sample.trim();
    if (value) {
      options.add(value);
    }
  }

  return [...options].slice(0, 50);
}

function isAmbiguousHeader(header: string): boolean {
  const normalized = normalizeHeader(header).toLowerCase();

  if (normalized.length <= 2) {
    return true;
  }

  const ambiguousPatterns = [
    /^col\d+$/,
    /^field\d+$/,
    /^column\s*\d+$/,
    /^data\d*$/,
    /^value\d*$/,
    /^info$/,
    /^notes?$/,
    /^misc$/,
    /^other$/,
    /^co\.?$/,
    /^e-?mail$/,
    /^name$/,
  ];

  return ambiguousPatterns.some((pattern) => pattern.test(normalized));
}

function buildFieldFromColumn(
  header: string,
  rows: ParsedRow[],
  usedKeys: Set<string>,
): InferredField {
  const label = normalizeHeader(header);
  let key = headerToFieldKey(label);

  if (usedKeys.has(key)) {
    let suffix = 2;
    while (usedKeys.has(`${key}_${suffix}`)) {
      suffix++;
    }
    key = `${key}_${suffix}`;
  }

  usedKeys.add(key);

  const samples = rows.map((row) => row[header] ?? "").filter(Boolean);
  const fieldType = inferFieldTypeFromSamples(samples);

  return {
    key,
    label,
    fieldType,
    sourceColumn: header,
    required: samples.length / Math.max(rows.length, 1) >= 0.9,
    ...(fieldType === FieldType.SELECT ? { options: collectSelectOptions(samples) } : {}),
  };
}

function inferHeuristicSchema(headers: string[], rows: ParsedRow[]) {
  const usedKeys = new Set<string>();
  const fields = headers.map((header) => buildFieldFromColumn(header, rows, usedKeys));
  const suggestedTypeName = `${headers[0] ? normalizeHeader(headers[0]) : "Imported"} Leads`;

  return {
    suggestedTypeName,
    fields,
  };
}

function needsAI(headers: string[], fields: InferredField[]): boolean {
  const ambiguousHeaders = headers.filter(isAmbiguousHeader).length;
  const ambiguousRatio = ambiguousHeaders / Math.max(headers.length, 1);

  if (ambiguousRatio >= 0.35) {
    return true;
  }

  const duplicateKeys = new Set(fields.map((field) => field.key)).size !== fields.length;
  if (duplicateKeys) {
    return true;
  }

  const genericLabels = fields.filter((field) => field.label.length <= 2).length;
  return genericLabels / Math.max(fields.length, 1) >= 0.25;
}

export async function inferImportSchema(headers: string[], rows: ParsedRow[]) {
  const heuristic = inferHeuristicSchema(headers, rows);

  if (!needsAI(headers, heuristic.fields)) {
    return {
      suggestedTypeName: heuristic.suggestedTypeName,
      fields: heuristic.fields,
      usedAI: false,
    };
  }

  if (!process.env.GEMINI_API_KEY) {
    return {
      suggestedTypeName: heuristic.suggestedTypeName,
      fields: heuristic.fields,
      usedAI: false,
    };
  }

  try {
    const aiResult = await analyzeImportWithAI({
      headers,
      previewRows: rows.slice(0, 8),
    });

    const usedKeys = new Set<string>();
    const fields = aiResult.fields.map((field) => {
      let key = field.key || fieldKeyFromLabel(field.label);

      if (usedKeys.has(key)) {
        let suffix = 2;
        while (usedKeys.has(`${key}_${suffix}`)) {
          suffix++;
        }
        key = `${key}_${suffix}`;
      }

      usedKeys.add(key);

      return {
        key,
        label: field.label,
        fieldType: field.fieldType,
        sourceColumn: field.sourceColumn,
        required: field.required,
        ...(field.options?.length ? { options: field.options } : {}),
      } satisfies InferredField;
    });

    return {
      suggestedTypeName: aiResult.suggestedTypeName,
      fields,
      usedAI: true,
    };
  } catch {
    return {
      suggestedTypeName: heuristic.suggestedTypeName,
      fields: heuristic.fields,
      usedAI: false,
    };
  }
}
