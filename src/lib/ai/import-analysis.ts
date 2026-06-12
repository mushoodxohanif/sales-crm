import { generateObject } from "ai";
import { z } from "zod";
import { FieldType } from "@/generated/prisma/client";
import { getGeminiModel } from "@/lib/ai/gemini";
import type { ParsedRow } from "@/lib/import/types";

const fieldTypeSchema = z.nativeEnum(FieldType);

const importAnalysisSchema = z.object({
  suggestedTypeName: z.string().min(1).max(120),
  fields: z
    .array(
      z.object({
        key: z.string().min(1).max(64),
        label: z.string().min(1).max(120),
        fieldType: fieldTypeSchema,
        sourceColumn: z.string().min(1),
        required: z.boolean(),
        options: z.array(z.string().min(1)).optional(),
      }),
    )
    .min(1),
});

const matchAnalysisSchema = z.object({
  matches: z
    .array(
      z.object({
        campaignTypeId: z.string(),
        confidence: z.number().min(0).max(1),
        columnMappings: z.record(z.string(), z.string()),
        rationale: z.string().optional(),
      }),
    )
    .default([]),
});

export async function analyzeImportWithAI(input: { headers: string[]; previewRows: ParsedRow[] }) {
  const sampleTable = input.previewRows
    .map((row) => input.headers.map((header) => `${header}: ${row[header] ?? ""}`).join(" | "))
    .join("\n");

  const { object } = await generateObject({
    model: getGeminiModel(),
    schema: importAnalysisSchema,
    prompt: `You are helping import spreadsheet leads into a sales CRM.

Analyze the uploaded file columns and infer a campaign type schema.

Headers: ${input.headers.join(", ")}

Sample rows:
${sampleTable}

Rules:
- Map each meaningful source column to exactly one field.
- Use snake_case keys (e.g. full_name, linkedin_url, company).
- Infer field types: EMAIL, URL, PHONE, NUMBER, DATE, SELECT (low cardinality), TEXTAREA (long text), TEXT (default).
- Mark fields required only when nearly every row has a value.
- For SELECT fields, include distinct options seen in samples.
- Suggest a concise campaign type name describing the lead source.`,
  });

  return object;
}

type ExistingTypeForAI = {
  id: string;
  name: string;
  fields: Array<{ key: string; label: string; fieldType: FieldType; required: boolean }>;
};

export async function matchImportWithAI(input: {
  headers: string[];
  previewRows: ParsedRow[];
  existingTypes: ExistingTypeForAI[];
}) {
  if (input.existingTypes.length === 0) {
    return { matches: [] };
  }

  const typeSummary = input.existingTypes
    .map((type) => {
      const fields = type.fields
        .map((field) => `${field.key} (${field.fieldType}${field.required ? ", required" : ""})`)
        .join(", ");
      return `ID: ${type.id}\nName: ${type.name}\nFields: ${fields}`;
    })
    .join("\n\n");

  const sampleTable = input.previewRows
    .slice(0, 5)
    .map((row) => input.headers.map((header) => `${header}: ${row[header] ?? ""}`).join(" | "))
    .join("\n");

  const { object } = await generateObject({
    model: getGeminiModel(),
    schema: matchAnalysisSchema,
    prompt: `Match an uploaded lead file to existing campaign types in a CRM.

Uploaded headers: ${input.headers.join(", ")}

Sample rows:
${sampleTable}

Existing campaign types:
${typeSummary}

Return ranked matches with confidence 0-1 and columnMappings from uploaded header -> existing field key.
Only include matches with confidence >= 0.5.
Prefer exact semantic matches (e.g. linkedin_url -> linkedin_url).`,
  });

  return object;
}
