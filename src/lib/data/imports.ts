import { db } from "@/lib/db";
import type { ImportAnalysis, ImportMatchResult } from "@/lib/import/types";

export async function getImportById(importId: string, userId: string) {
  return db.leadImport.findFirst({
    where: {
      id: importId,
      userId,
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function getCampaignTypesForMatching() {
  return db.campaignType.findMany({
    orderBy: { name: "asc" },
    include: {
      fields: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          key: true,
          label: true,
          fieldType: true,
          required: true,
        },
      },
      campaigns: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });
}

export function parseStoredAnalysis(value: unknown): ImportAnalysis | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (!record.parsed || !record.fields || !record.suggestedTypeName) {
    return null;
  }

  return value as ImportAnalysis;
}

export function parseStoredMatchResult(value: unknown): ImportMatchResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (!Array.isArray(record.typeMatches)) {
    return null;
  }

  return value as ImportMatchResult;
}
