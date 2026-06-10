import { FieldType, ImportStatus, type Prisma } from "@/generated/prisma/client";
import { DEFAULT_STAGES } from "@/lib/campaigns/default-stages";
import {
  createImportBatchDuplicateTracker,
  findDuplicateFieldLabel,
  recordBatchFieldValues,
} from "@/lib/leads/duplicates";
import { type LeadFieldValueData, toFieldDefinitions } from "@/lib/leads/field-values";
import type { ImportAnalysis, ImportMapping } from "./types";

type TxClient = Prisma.TransactionClient;

type CampaignTypeFieldRecord = {
  id: string;
  key: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  showOnKanbanCard: boolean;
  isUnique: boolean;
  sortOrder: number;
  options: unknown;
};

function parseNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeCellValue(
  raw: string,
  fieldType: FieldType,
  options: string[],
): string | number | boolean | string[] | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  switch (fieldType) {
    case FieldType.CHECKBOX:
      return ["true", "yes", "1", "y"].includes(trimmed.toLowerCase());
    case FieldType.NUMBER: {
      const value = parseNumber(trimmed);
      return value ?? trimmed;
    }
    case FieldType.MULTI_SELECT:
      return trimmed
        .split(/[,;|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    case FieldType.SELECT:
      if (options.length > 0 && !options.includes(trimmed)) {
        return trimmed;
      }
      return trimmed;
    default:
      return trimmed;
  }
}

function toJsonValue(value: string | number | boolean | string[]): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function resolveDestination(
  tx: TxClient,
  mapping: ImportMapping,
): Promise<{ campaignId: string; fields: CampaignTypeFieldRecord[] }> {
  const destination = mapping.destination;

  if (destination.mode === "existing_campaign") {
    const campaign = await tx.campaign.findUnique({
      where: { id: destination.campaignId },
      include: {
        campaignType: {
          include: {
            fields: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new Error("Selected campaign was not found.");
    }

    if (campaign.campaignTypeId !== destination.campaignTypeId) {
      throw new Error("Campaign does not belong to the selected campaign type.");
    }

    return {
      campaignId: campaign.id,
      fields: campaign.campaignType.fields,
    };
  }

  if (destination.mode === "new_campaign") {
    const campaignType = await tx.campaignType.findUnique({
      where: { id: destination.campaignTypeId },
      include: {
        fields: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!campaignType) {
      throw new Error("Selected campaign type was not found.");
    }

    const campaign = await tx.campaign.create({
      data: {
        name: destination.campaignName,
        campaignTypeId: destination.campaignTypeId,
        stages: {
          create: DEFAULT_STAGES.map((stage) => ({ ...stage })),
        },
      },
      select: { id: true },
    });

    return {
      campaignId: campaign.id,
      fields: campaignType.fields,
    };
  }

  const campaignType = await tx.campaignType.create({
    data: {
      name: destination.typeName,
      slug: destination.typeSlug,
      fields: {
        create: mapping.fields.map((field, index) => ({
          key: field.key,
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          sortOrder: index,
          ...(field.options?.length ? { options: field.options as Prisma.InputJsonValue } : {}),
        })),
      },
    },
    include: {
      fields: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const campaign = await tx.campaign.create({
    data: {
      name: destination.campaignName,
      campaignTypeId: campaignType.id,
      stages: {
        create: DEFAULT_STAGES.map((stage) => ({ ...stage })),
      },
    },
    select: { id: true },
  });

  return {
    campaignId: campaign.id,
    fields: campaignType.fields,
  };
}

export async function commitLeadImport(
  tx: TxClient,
  importId: string,
  analysis: ImportAnalysis,
  mapping: ImportMapping,
) {
  const { campaignId, fields } = await resolveDestination(tx, mapping);
  const fieldDefinitions = toFieldDefinitions(fields);

  const defaultStage = await tx.leadStage.findFirst({
    where: {
      campaignId,
      isDefault: true,
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  const fallbackStage = await tx.leadStage.findFirst({
    where: { campaignId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  const stageId = defaultStage?.id ?? fallbackStage?.id;

  if (!stageId) {
    throw new Error("Campaign has no pipeline stages.");
  }

  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  const columnToFieldKey = new Map(
    mapping.columnMappings
      .filter((item) => item.fieldKey)
      .map((item) => [item.sourceColumn, item.fieldKey as string]),
  );

  const BATCH_SIZE = 100;
  const batchDuplicates = createImportBatchDuplicateTracker();
  let importedCount = 0;
  let skippedDuplicates = 0;
  const skippedDuplicateRows: number[] = [];

  for (let offset = 0; offset < analysis.parsed.rows.length; offset += BATCH_SIZE) {
    const batch = analysis.parsed.rows.slice(offset, offset + BATCH_SIZE);

    for (const [batchIndex, row] of batch.entries()) {
      const rowNumber = offset + batchIndex + 1;
      const fieldValues: Array<{ fieldId: string; value: Prisma.InputJsonValue }> = [];
      const duplicateCheckValues: LeadFieldValueData[] = [];

      for (const [sourceColumn, fieldKey] of columnToFieldKey) {
        const field = fieldByKey.get(fieldKey);
        if (!field) {
          continue;
        }

        const rawValue = row[sourceColumn] ?? "";
        const normalized = normalizeCellValue(
          rawValue,
          field.fieldType,
          Array.isArray(field.options)
            ? field.options.filter((item): item is string => typeof item === "string")
            : [],
        );

        duplicateCheckValues.push({
          fieldId: field.id,
          value: normalized,
        });

        if (normalized === null) {
          continue;
        }

        fieldValues.push({
          fieldId: field.id,
          value: toJsonValue(normalized),
        });
      }

      const duplicateLabel = await findDuplicateFieldLabel({
        campaignId,
        fields: fieldDefinitions,
        fieldValues: duplicateCheckValues,
        batchValues: batchDuplicates,
        client: tx,
      });

      if (duplicateLabel) {
        skippedDuplicates += 1;
        skippedDuplicateRows.push(rowNumber);
        continue;
      }

      await tx.lead.create({
        data: {
          campaignId,
          currentStageId: stageId,
          sourceImportId: importId,
          fieldValues: {
            create: fieldValues,
          },
        },
      });

      recordBatchFieldValues(batchDuplicates, fieldDefinitions, duplicateCheckValues);
      importedCount += 1;
    }
  }

  await tx.leadImport.update({
    where: { id: importId },
    data: {
      status: ImportStatus.COMMITTED,
      campaignId,
      mapping: mapping as unknown as Prisma.InputJsonValue,
    },
  });

  return { campaignId, importedCount, skippedDuplicates, skippedDuplicateRows };
}
