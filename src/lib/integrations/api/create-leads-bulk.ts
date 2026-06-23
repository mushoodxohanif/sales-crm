import { CampaignStatus, type Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  fieldValuesFromKeys,
  IDEMPOTENCY_FIELD_KEY,
  mergeIdempotencyKey,
} from "@/lib/integrations/api/field-values";
import { createLeadInternal, findLeadByExternalId } from "@/lib/leads/create-lead";
import {
  createImportBatchDuplicateTracker,
  findDuplicateFieldLabel,
  recordBatchFieldValues,
} from "@/lib/leads/duplicates";
import { type LeadFieldValueData, toFieldDefinitions } from "@/lib/leads/field-values";
import { validateLeadFieldValues } from "@/lib/leads/validation";
import { buildVersionSummary, recordLeadVersion, serializeFieldValues } from "@/lib/leads/versions";

export type BulkLeadInput = {
  fieldValues: Record<string, string | number | boolean | string[] | null>;
  idempotencyKey?: string;
};

export type BulkLeadResult = {
  idempotencyKey?: string;
  id?: string;
  status: "created" | "skipped" | "failed";
  error?: string;
};

export type BulkCreateLeadsResult = {
  imported: number;
  skipped: number;
  failed: number;
  results: BulkLeadResult[];
};

const BATCH_SIZE = 50;

function toJsonValue(value: string | number | boolean | string[]): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function resolveIdempotentLead(
  campaignId: string,
  idempotencyKey: string,
): Promise<{ id: string } | null> {
  const existing = await findLeadByExternalId(campaignId, IDEMPOTENCY_FIELD_KEY, idempotencyKey);

  return existing;
}

export async function createLeadsBulk(input: {
  campaignId: string;
  leads: BulkLeadInput[];
  userId: string;
}): Promise<BulkCreateLeadsResult> {
  const { campaignId, leads, userId } = input;

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      campaignType: {
        include: {
          fields: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      stages: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  if (campaign.status === CampaignStatus.ARCHIVED) {
    throw new Error("Cannot add leads to an archived campaign.");
  }

  const fields = toFieldDefinitions(campaign.campaignType.fields);
  const stageId = campaign.stages.find((stage) => stage.isDefault)?.id ?? campaign.stages[0]?.id;

  if (!stageId) {
    throw new Error("Campaign has no pipeline stages.");
  }

  const results: BulkLeadResult[] = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let offset = 0; offset < leads.length; offset += BATCH_SIZE) {
    const batch = leads.slice(offset, offset + BATCH_SIZE);
    const batchDuplicates = createImportBatchDuplicateTracker();

    for (const leadInput of batch) {
      const resultKey = leadInput.idempotencyKey;

      try {
        if (leadInput.idempotencyKey) {
          const existing = await resolveIdempotentLead(campaignId, leadInput.idempotencyKey);

          if (existing) {
            results.push({
              idempotencyKey: resultKey,
              id: existing.id,
              status: "skipped",
            });
            skipped += 1;
            continue;
          }
        }

        const valuesByKey = leadInput.idempotencyKey
          ? mergeIdempotencyKey(fields, leadInput.fieldValues, leadInput.idempotencyKey)
          : leadInput.fieldValues;

        let fieldValues: LeadFieldValueData[];

        try {
          fieldValues = fieldValuesFromKeys(fields, valuesByKey);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid field values.";
          results.push({
            idempotencyKey: resultKey,
            status: "failed",
            error: message,
          });
          failed += 1;
          continue;
        }

        const validation = validateLeadFieldValues(fields, fieldValues);

        if (!validation.success) {
          results.push({
            idempotencyKey: resultKey,
            status: "failed",
            error: validation.error,
          });
          failed += 1;
          continue;
        }

        const duplicateLabel = await findDuplicateFieldLabel({
          campaignId,
          fields,
          fieldValues: validation.normalized,
          batchValues: batchDuplicates,
        });

        if (duplicateLabel) {
          results.push({
            idempotencyKey: resultKey,
            status: "skipped",
            error: `Duplicate ${duplicateLabel}.`,
          });
          skipped += 1;
          continue;
        }

        const lead = await db.lead.create({
          data: {
            campaignId,
            currentStageId: stageId,
            fieldValues: {
              create: validation.normalized
                .filter((fieldValue) => fieldValue.value !== null)
                .map((fieldValue) => ({
                  fieldId: fieldValue.fieldId,
                  value: toJsonValue(fieldValue.value as string | number | boolean | string[]),
                })),
            },
          },
          select: { id: true },
        });

        const snapshot = {
          stageId,
          fieldValues: serializeFieldValues(validation.normalized),
        };

        await recordLeadVersion(
          {
            leadId: lead.id,
            userId,
            changeType: "CREATED",
            snapshot,
            summary: buildVersionSummary({
              changeType: "CREATED",
              fields,
              previousSnapshot: null,
              nextSnapshot: snapshot,
            }),
          },
          db,
        );

        recordBatchFieldValues(batchDuplicates, fields, validation.normalized);

        results.push({
          idempotencyKey: resultKey,
          id: lead.id,
          status: "created",
        });
        imported += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create lead.";
        results.push({
          idempotencyKey: resultKey,
          status: "failed",
          error: message,
        });
        failed += 1;
      }
    }
  }

  return { imported, skipped, failed, results };
}

export async function createLeadFromApi(input: {
  campaignId: string;
  fieldValues: Record<string, string | number | boolean | string[] | null>;
  idempotencyKey?: string;
  userId: string;
}): Promise<
  | { status: "created"; id: string }
  | { status: "existing"; id: string }
  | { status: "error"; error: string; statusCode: number }
> {
  const { campaignId, idempotencyKey, userId } = input;

  if (idempotencyKey) {
    const existing = await resolveIdempotentLead(campaignId, idempotencyKey);

    if (existing) {
      return { status: "existing", id: existing.id };
    }
  }

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
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
    return { status: "error", error: "Campaign not found.", statusCode: 404 };
  }

  const fields = toFieldDefinitions(campaign.campaignType.fields);
  const valuesByKey = idempotencyKey
    ? mergeIdempotencyKey(fields, input.fieldValues, idempotencyKey)
    : input.fieldValues;

  let fieldValues: LeadFieldValueData[];

  try {
    fieldValues = fieldValuesFromKeys(fields, valuesByKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid field values.";
    return { status: "error", error: message, statusCode: 400 };
  }

  const result = await createLeadInternal({
    campaignId,
    fieldValues,
    userId,
  });

  if (!result.success) {
    const statusCode = result.error.includes("already exists") ? 409 : 400;
    return { status: "error", error: result.error, statusCode };
  }

  return { status: "created", id: result.id };
}
