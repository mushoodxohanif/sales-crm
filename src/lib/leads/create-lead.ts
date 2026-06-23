import { CampaignStatus, type Prisma, type PrismaClient } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { assertNoDuplicateFieldValues, findLeadIdByUniqueFieldValue } from "@/lib/leads/duplicates";
import { type LeadFieldValueData, toFieldDefinitions } from "@/lib/leads/field-values";
import { validateLeadFieldValues } from "@/lib/leads/validation";
import { buildVersionSummary, recordLeadVersion, serializeFieldValues } from "@/lib/leads/versions";

export type CreateLeadDbClient = Pick<
  PrismaClient,
  "campaign" | "lead" | "leadStage" | "leadVersion" | "$queryRaw" | "leadFieldValue"
>;

export type CreateLeadInternalInput = {
  campaignId: string;
  fieldValues: LeadFieldValueData[];
  currentStageId?: string;
  userId?: string | null;
  client?: CreateLeadDbClient;
};

export type CreateLeadInternalResult =
  | { success: true; id: string }
  | { success: false; error: string };

function toJsonValue(value: string | number | boolean | string[]): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function getActiveCampaign(campaignId: string, client: CreateLeadDbClient) {
  return client.campaign.findUnique({
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
}

async function assertStageBelongsToCampaign(
  stageId: string,
  campaignId: string,
  client: CreateLeadDbClient,
) {
  const stage = await client.leadStage.findFirst({
    where: { id: stageId, campaignId },
    select: { id: true },
  });

  return stage !== null;
}

export async function findLeadByExternalId(
  campaignId: string,
  fieldKey: string,
  value: string,
  client: CreateLeadDbClient = db,
): Promise<{ id: string } | null> {
  const campaign = await client.campaign.findUnique({
    where: { id: campaignId },
    select: {
      campaignType: {
        select: {
          fields: {
            select: { id: true, key: true },
          },
        },
      },
    },
  });

  const field = campaign?.campaignType.fields.find((item) => item.key === fieldKey);
  if (!field) {
    return null;
  }

  const leadId = await findLeadIdByUniqueFieldValue(client, {
    campaignId,
    fieldId: field.id,
    value,
  });

  return leadId ? { id: leadId } : null;
}

export async function createLeadInternal(
  input: CreateLeadInternalInput,
): Promise<CreateLeadInternalResult> {
  const client = input.client ?? db;
  const { campaignId, currentStageId, fieldValues, userId = null } = input;

  const campaign = await getActiveCampaign(campaignId, client);

  if (!campaign) {
    return { success: false, error: "Campaign not found." };
  }

  if (campaign.status === CampaignStatus.ARCHIVED) {
    return { success: false, error: "Cannot add leads to an archived campaign." };
  }

  const fields = toFieldDefinitions(campaign.campaignType.fields);
  const validation = validateLeadFieldValues(fields, fieldValues);

  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const stageId =
    currentStageId ??
    campaign.stages.find((stage) => stage.isDefault)?.id ??
    campaign.stages[0]?.id;

  if (!stageId) {
    return { success: false, error: "Campaign has no pipeline stages." };
  }

  if (currentStageId) {
    const stageValid = await assertStageBelongsToCampaign(currentStageId, campaignId, client);
    if (!stageValid) {
      return { success: false, error: "Selected stage does not belong to this campaign." };
    }
  }

  const duplicateCheck = await assertNoDuplicateFieldValues({
    campaignId,
    fields,
    fieldValues: validation.normalized,
    client,
  });

  if (!duplicateCheck.success) {
    return { success: false, error: duplicateCheck.error };
  }

  const lead = await client.lead.create({
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
    client,
  );

  return { success: true, id: lead.id };
}
