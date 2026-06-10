"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ImportStatus } from "@/generated/prisma/client";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import {
  getCampaignTypesForMatching,
  getImportById,
  parseStoredAnalysis,
  parseStoredMatchResult,
} from "@/lib/data/imports";
import { db } from "@/lib/db";
import { commitLeadImport } from "@/lib/import/commit-import";
import { inferImportSchema } from "@/lib/import/infer-schema";
import { matchImportToCampaignTypes } from "@/lib/import/matcher";
import { parseUploadedFile } from "@/lib/import/parse-file";
import type { ImportAnalysis, ImportMapping, ImportMatchResult } from "@/lib/import/types";
import {
  analyzeImportSchema,
  commitImportSchema,
  type ImportMappingInput,
} from "@/lib/validators/import";

async function requireAuthUserId(): Promise<ActionResult<string>> {
  const session = await auth();

  if (!session?.user?.id) {
    return actionError("You must be signed in to perform this action.");
  }

  return actionSuccess(session.user.id);
}

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input.";
}

function revalidateImportPaths(campaignId?: string) {
  revalidatePath("/import");
  revalidatePath("/dashboard");
  revalidatePath("/campaigns");

  if (campaignId) {
    revalidatePath(`/campaigns/${campaignId}`);
  }
}

export async function uploadAndParseFile(
  formData: FormData,
): Promise<ActionResult<{ importId: string; rowCount: number; fileName: string }>> {
  const authResult = await requireAuthUserId();
  if (!authResult.success) {
    return authResult;
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return actionError("Please choose a CSV or XLSX file to upload.");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseUploadedFile(file.name, buffer);

    const leadImport = await db.leadImport.create({
      data: {
        fileName: file.name,
        fileType: file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv",
        rowCount: parsed.rows.length,
        status: ImportStatus.UPLOADED,
        userId: authResult.data,
        analysis: {
          parsed,
        } as object,
      },
      select: {
        id: true,
        rowCount: true,
        fileName: true,
      },
    });

    revalidateImportPaths();

    return actionSuccess({
      importId: leadImport.id,
      rowCount: leadImport.rowCount,
      fileName: leadImport.fileName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse file.";
    return actionError(message);
  }
}

export async function analyzeImport(input: unknown): Promise<
  ActionResult<{
    importId: string;
    analysis: ImportAnalysis;
    matchResult: ImportMatchResult;
  }>
> {
  const authResult = await requireAuthUserId();
  if (!authResult.success) {
    return authResult;
  }

  const parsed = analyzeImportSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const leadImport = await getImportById(parsed.data.importId, authResult.data);

  if (!leadImport) {
    return actionError("Import not found.");
  }

  const storedAnalysis = parseStoredAnalysis(leadImport.analysis);
  const parsedData = storedAnalysis?.parsed;

  if (!parsedData) {
    return actionError("Uploaded file data is missing. Please upload again.");
  }

  try {
    const inferred = await inferImportSchema(parsedData.headers, parsedData.rows);
    const campaignTypes = await getCampaignTypesForMatching();
    const matchResult = await matchImportToCampaignTypes(
      inferred.fields,
      parsedData.headers,
      parsedData.previewRows,
      campaignTypes,
    );

    const analysis: ImportAnalysis = {
      parsed: parsedData,
      suggestedTypeName: inferred.suggestedTypeName,
      fields: inferred.fields,
      usedAI: inferred.usedAI,
    };

    await db.leadImport.update({
      where: { id: leadImport.id },
      data: {
        status: ImportStatus.ANALYZED,
        analysis: {
          ...analysis,
          matchResult,
        } as object,
      },
    });

    revalidateImportPaths();

    return actionSuccess({
      importId: leadImport.id,
      analysis,
      matchResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze import.";

    await db.leadImport.update({
      where: { id: leadImport.id },
      data: {
        status: ImportStatus.FAILED,
        errorMessage: message,
      },
    });

    return actionError(message);
  }
}

export async function getImportDetails(importId: string): Promise<
  ActionResult<{
    import: {
      id: string;
      fileName: string;
      fileType: string;
      rowCount: number;
      status: ImportStatus;
      errorMessage: string | null;
      campaign: { id: string; name: string } | null;
    };
    analysis: ImportAnalysis | null;
    matchResult: ImportMatchResult | null;
    campaignTypes: Awaited<ReturnType<typeof getCampaignTypesForMatching>>;
  }>
> {
  const authResult = await requireAuthUserId();
  if (!authResult.success) {
    return authResult;
  }

  const leadImport = await getImportById(importId, authResult.data);

  if (!leadImport) {
    return actionError("Import not found.");
  }

  const stored = parseStoredAnalysis(leadImport.analysis);
  const matchResult = stored
    ? parseStoredMatchResult((leadImport.analysis as Record<string, unknown>)?.matchResult)
    : null;

  const campaignTypes = await getCampaignTypesForMatching();

  return actionSuccess({
    import: {
      id: leadImport.id,
      fileName: leadImport.fileName,
      fileType: leadImport.fileType,
      rowCount: leadImport.rowCount,
      status: leadImport.status,
      errorMessage: leadImport.errorMessage,
      campaign: leadImport.campaign,
    },
    analysis: stored,
    matchResult,
    campaignTypes,
  });
}

function buildDefaultMapping(
  analysis: ImportAnalysis,
  matchResult: ImportMatchResult | null,
): ImportMappingInput {
  const bestMatch = matchResult?.bestMatch;

  if (bestMatch && bestMatch.score !== "none") {
    const firstCampaign = bestMatch.campaigns[0];

    if (firstCampaign) {
      return {
        destination: {
          mode: "existing_campaign",
          campaignTypeId: bestMatch.campaignTypeId,
          campaignId: firstCampaign.id,
        },
        fields: analysis.fields,
        columnMappings: analysis.fields.map((field) => ({
          sourceColumn: field.sourceColumn,
          fieldKey: bestMatch.columnMappings[field.sourceColumn] ?? field.key,
        })),
      };
    }

    return {
      destination: {
        mode: "new_campaign",
        campaignTypeId: bestMatch.campaignTypeId,
        campaignName: `${analysis.suggestedTypeName} Import`,
      },
      fields: analysis.fields,
      columnMappings: analysis.fields.map((field) => ({
        sourceColumn: field.sourceColumn,
        fieldKey: bestMatch.columnMappings[field.sourceColumn] ?? field.key,
      })),
    };
  }

  return {
    destination: {
      mode: "new_type",
      typeName: analysis.suggestedTypeName,
      typeSlug: analysis.suggestedTypeName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64),
      campaignName: `${analysis.suggestedTypeName} Import`,
    },
    fields: analysis.fields,
    columnMappings: analysis.fields.map((field) => ({
      sourceColumn: field.sourceColumn,
      fieldKey: field.key,
    })),
  };
}

export async function commitLeadImportAction(input: unknown): Promise<
  ActionResult<{
    campaignId: string;
    importId: string;
    importedCount: number;
    skippedDuplicates: number;
  }>
> {
  const authResult = await requireAuthUserId();
  if (!authResult.success) {
    return authResult;
  }

  const parsed = commitImportSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const leadImport = await getImportById(parsed.data.importId, authResult.data);

  if (!leadImport) {
    return actionError("Import not found.");
  }

  if (leadImport.status === ImportStatus.COMMITTED) {
    return actionError("This import has already been committed.");
  }

  const analysis = parseStoredAnalysis(leadImport.analysis);

  if (!analysis) {
    return actionError("Import analysis is missing. Please analyze the file again.");
  }

  try {
    const result = await db.$transaction(async (tx) => {
      return commitLeadImport(tx, leadImport.id, analysis, parsed.data.mapping as ImportMapping);
    });

    revalidateImportPaths(result.campaignId);

    return actionSuccess({
      campaignId: result.campaignId,
      importId: leadImport.id,
      importedCount: result.importedCount,
      skippedDuplicates: result.skippedDuplicates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to commit import.";

    await db.leadImport.update({
      where: { id: leadImport.id },
      data: {
        status: ImportStatus.FAILED,
        errorMessage: message,
      },
    });

    return actionError(message);
  }
}

export async function getDefaultImportMapping(
  importId: string,
): Promise<ActionResult<ImportMappingInput>> {
  const details = await getImportDetails(importId);

  if (!details.success) {
    return actionError(details.error);
  }

  if (!details.data.analysis) {
    return actionError("Import has not been analyzed yet.");
  }

  return actionSuccess(buildDefaultMapping(details.data.analysis, details.data.matchResult));
}
