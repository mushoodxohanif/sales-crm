import { CampaignStatus, type FieldType } from "@/generated/prisma/client";
import { matchImportWithAI } from "@/lib/ai/import-analysis";
import { headerToFieldKey } from "./parse-file";
import type { ImportMatchResult, InferredField, MatchScore, TypeMatch } from "./types";

type ExistingCampaignType = {
  id: string;
  name: string;
  fields: Array<{
    id: string;
    key: string;
    label: string;
    fieldType: FieldType;
    required: boolean;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    status: CampaignStatus;
  }>;
};

function scoreTypeMatch(
  inferredFields: InferredField[],
  campaignType: ExistingCampaignType,
): Omit<TypeMatch, "campaignTypeId" | "campaignTypeName" | "campaigns"> {
  const _typeFieldKeys = new Set(campaignType.fields.map((field) => field.key));
  const columnMappings: Record<string, string> = {};
  let mappedFields = 0;

  for (const inferredField of inferredFields) {
    const normalizedSource = headerToFieldKey(inferredField.sourceColumn);

    const exactField = campaignType.fields.find(
      (field) =>
        field.key === inferredField.key ||
        field.key === normalizedSource ||
        field.label.toLowerCase() === inferredField.label.toLowerCase(),
    );

    if (exactField) {
      columnMappings[inferredField.sourceColumn] = exactField.key;
      mappedFields++;
    }
  }

  const requiredFields = campaignType.fields.filter((field) => field.required);
  const missingRequired = requiredFields
    .filter((field) => !Object.values(columnMappings).includes(field.key))
    .map((field) => field.key);

  let score: MatchScore = "none";

  if (mappedFields === 0) {
    score = "none";
  } else if (missingRequired.length === 0 && mappedFields >= campaignType.fields.length * 0.7) {
    score = "full";
  } else {
    score = "partial";
  }

  return {
    score,
    mappedFields,
    totalFields: campaignType.fields.length,
    missingRequired,
    columnMappings,
  };
}

function sortMatches(matches: TypeMatch[]): TypeMatch[] {
  const scoreWeight: Record<MatchScore, number> = {
    full: 3,
    partial: 2,
    none: 1,
  };

  return [...matches].sort((left, right) => {
    const scoreDiff = scoreWeight[right.score] - scoreWeight[left.score];
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    const confidenceDiff = (right.confidence ?? 0) - (left.confidence ?? 0);
    if (confidenceDiff !== 0) {
      return confidenceDiff;
    }

    return right.mappedFields - left.mappedFields;
  });
}

export async function matchImportToCampaignTypes(
  inferredFields: InferredField[],
  headers: string[],
  previewRows: Array<Record<string, string>>,
  campaignTypes: ExistingCampaignType[],
): Promise<ImportMatchResult> {
  const deterministicMatches: TypeMatch[] = campaignTypes.map((campaignType) => {
    const scored = scoreTypeMatch(inferredFields, campaignType);

    return {
      campaignTypeId: campaignType.id,
      campaignTypeName: campaignType.name,
      campaigns: campaignType.campaigns
        .filter((campaign) => campaign.status === CampaignStatus.ACTIVE)
        .map((campaign) => ({ id: campaign.id, name: campaign.name })),
      ...scored,
    };
  });

  let matches = sortMatches(deterministicMatches);

  if (process.env.GEMINI_API_KEY && campaignTypes.length > 0) {
    try {
      const aiResult = await matchImportWithAI({
        headers,
        previewRows,
        existingTypes: campaignTypes.map((type) => ({
          id: type.id,
          name: type.name,
          fields: type.fields.map((field) => ({
            key: field.key,
            label: field.label,
            fieldType: field.fieldType,
            required: field.required,
          })),
        })),
      });

      for (const aiMatch of aiResult.matches) {
        const existing = matches.find((match) => match.campaignTypeId === aiMatch.campaignTypeId);

        if (!existing) {
          continue;
        }

        existing.confidence = aiMatch.confidence;
        existing.columnMappings = {
          ...existing.columnMappings,
          ...aiMatch.columnMappings,
        };

        const mappedCount = Object.keys(existing.columnMappings).length;
        existing.mappedFields = mappedCount;

        const campaignType = campaignTypes.find((type) => type.id === aiMatch.campaignTypeId);
        if (campaignType) {
          const requiredFields = campaignType.fields.filter((field) => field.required);
          existing.missingRequired = requiredFields
            .filter((field) => !Object.values(existing.columnMappings).includes(field.key))
            .map((field) => field.key);
          existing.score =
            existing.missingRequired.length === 0 && mappedCount >= campaignType.fields.length * 0.7
              ? "full"
              : mappedCount > 0
                ? "partial"
                : "none";
        }
      }

      matches = sortMatches(matches);
    } catch {
      // Keep deterministic matches when AI matching fails.
    }
  }

  const bestMatch =
    matches.find((match) => match.score === "full") ??
    matches.find((match) => match.score === "partial") ??
    null;

  return {
    typeMatches: matches,
    bestMatch,
  };
}
