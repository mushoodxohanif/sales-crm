"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { FieldType, type Prisma } from "@/generated/prisma/client";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import { db } from "@/lib/db";
import {
  type CampaignTypeFieldBlockInput,
  type CampaignTypeFieldInput,
  createCampaignTypeSchema,
  deleteCampaignTypeSchema,
  updateCampaignTypeSchema,
  upsertCampaignTypeFieldsSchema,
} from "@/lib/validators/campaign-type";

async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    return actionError("You must be signed in to perform this action.");
  }

  return null;
}

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input.";
}

function normalizeFieldInput(field: CampaignTypeFieldInput, sortOrder: number, groupId?: string) {
  const options =
    field.fieldType === FieldType.SELECT || field.fieldType === FieldType.MULTI_SELECT
      ? field.options
      : undefined;

  return {
    key: field.key,
    label: field.label,
    fieldType: field.fieldType,
    required: field.required,
    showOnKanbanCard: field.showOnKanbanCard,
    isUnique: field.isUnique,
    sortOrder,
    groupId: groupId ?? null,
    options: options ? (options as Prisma.InputJsonValue) : undefined,
  };
}

type FlattenedField = CampaignTypeFieldInput & {
  groupIndex?: number;
};

function flattenBlocks(blocks: CampaignTypeFieldBlockInput[]): {
  fields: FlattenedField[];
  groups: Array<{ id?: string; label: string; groupIndex: number }>;
} {
  const fields: FlattenedField[] = [];
  const groups: Array<{ id?: string; label: string; groupIndex: number }> = [];
  let sortOrder = 0;
  let groupIndex = 0;

  for (const block of blocks) {
    if (block.type === "field") {
      fields.push({ ...block.field, sortOrder });
      sortOrder += 1;
      continue;
    }

    const currentGroupIndex = groupIndex;
    groups.push({
      id: block.group.id,
      label: block.group.label,
      groupIndex: currentGroupIndex,
    });
    groupIndex += 1;

    for (const field of block.group.fields) {
      fields.push({ ...field, sortOrder, groupIndex: currentGroupIndex });
      sortOrder += 1;
    }
  }

  return { fields, groups };
}

function validateUniqueFieldKeys(fields: FlattenedField[]) {
  const keys = fields.map((field) => field.key);
  return new Set(keys).size === keys.length;
}

export async function createCampaignType(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = createCampaignTypeSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { name, slug, description, blocks } = parsed.data;
  const { fields, groups } = flattenBlocks(blocks);

  const existing = await db.campaignType.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing) {
    return actionError("A campaign type with this slug already exists.");
  }

  if (!validateUniqueFieldKeys(fields)) {
    return actionError("Field keys must be unique within a campaign type.");
  }

  const campaignType = await db.$transaction(async (tx) => {
    const created = await tx.campaignType.create({
      data: {
        name,
        slug,
        description,
      },
      select: { id: true },
    });

    const groupIdByIndex = new Map<number, string>();

    for (const group of groups) {
      const createdGroup = await tx.campaignTypeFieldGroup.create({
        data: {
          campaignTypeId: created.id,
          label: group.label,
        },
        select: { id: true },
      });
      groupIdByIndex.set(group.groupIndex, createdGroup.id);
    }

    for (const field of fields) {
      const groupId =
        field.groupIndex === undefined ? undefined : groupIdByIndex.get(field.groupIndex);

      await tx.campaignTypeField.create({
        data: {
          campaignTypeId: created.id,
          ...normalizeFieldInput(field, field.sortOrder, groupId),
        },
      });
    }

    return created;
  });

  revalidatePath("/campaign-types");
  revalidatePath("/dashboard");

  return actionSuccess({ id: campaignType.id });
}

export async function updateCampaignType(input: unknown): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = updateCampaignTypeSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { id, name, slug, description } = parsed.data;

  const existing = await db.campaignType.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return actionError("Campaign type not found.");
  }

  const slugConflict = await db.campaignType.findFirst({
    where: {
      slug,
      NOT: { id },
    },
    select: { id: true },
  });

  if (slugConflict) {
    return actionError("A campaign type with this slug already exists.");
  }

  await db.campaignType.update({
    where: { id },
    data: {
      name,
      slug,
      description,
    },
  });

  revalidatePath("/campaign-types");
  revalidatePath(`/campaign-types/${id}`);
  revalidatePath("/dashboard");

  return actionSuccess({ id });
}

export async function deleteCampaignType(input: unknown): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = deleteCampaignTypeSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { id } = parsed.data;

  const campaignType = await db.campaignType.findUnique({
    where: { id },
    include: {
      _count: {
        select: { campaigns: true },
      },
    },
  });

  if (!campaignType) {
    return actionError("Campaign type not found.");
  }

  await db.$transaction(async (tx) => {
    if (campaignType._count.campaigns > 0) {
      await tx.campaign.deleteMany({
        where: { campaignTypeId: id },
      });
    }

    await tx.campaignType.delete({
      where: { id },
    });
  });

  revalidatePath("/campaigns");

  revalidatePath("/campaign-types");
  revalidatePath("/dashboard");

  return actionSuccess(undefined);
}

export async function upsertCampaignTypeFields(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const parsed = upsertCampaignTypeFieldsSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const { campaignTypeId, blocks } = parsed.data;
  const { fields, groups } = flattenBlocks(blocks);

  const campaignType = await db.campaignType.findUnique({
    where: { id: campaignTypeId },
    include: {
      fields: {
        select: {
          id: true,
          key: true,
          _count: {
            select: { fieldValues: true },
          },
        },
      },
      fieldGroups: {
        select: { id: true },
      },
    },
  });

  if (!campaignType) {
    return actionError("Campaign type not found.");
  }

  if (!validateUniqueFieldKeys(fields)) {
    return actionError("Field keys must be unique within a campaign type.");
  }

  const incomingFieldIds = new Set(fields.flatMap((field) => (field.id ? [field.id] : [])));
  const fieldsToRemove = campaignType.fields.filter((field) => !incomingFieldIds.has(field.id));

  for (const field of fieldsToRemove) {
    if (field._count.fieldValues > 0) {
      return actionError(
        `Cannot remove field "${field.key}" because leads already have values for it.`,
      );
    }
  }

  const incomingGroupIds = new Set(groups.flatMap((group) => (group.id ? [group.id] : [])));
  const groupsToRemove = campaignType.fieldGroups.filter(
    (group) => !incomingGroupIds.has(group.id),
  );

  await db.$transaction(async (tx) => {
    if (fieldsToRemove.length > 0) {
      await tx.campaignTypeField.deleteMany({
        where: {
          id: { in: fieldsToRemove.map((field) => field.id) },
        },
      });
    }

    if (groupsToRemove.length > 0) {
      await tx.campaignTypeFieldGroup.deleteMany({
        where: {
          id: { in: groupsToRemove.map((group) => group.id) },
        },
      });
    }

    const groupIdByIndex = new Map<number, string>();

    for (const group of groups) {
      if (group.id) {
        const existingGroup = campaignType.fieldGroups.find((item) => item.id === group.id);

        if (!existingGroup) {
          throw new Error(`Field group "${group.label}" was not found on this campaign type.`);
        }

        await tx.campaignTypeFieldGroup.update({
          where: { id: group.id },
          data: { label: group.label },
        });
        groupIdByIndex.set(group.groupIndex, group.id);
        continue;
      }

      const createdGroup = await tx.campaignTypeFieldGroup.create({
        data: {
          campaignTypeId,
          label: group.label,
        },
        select: { id: true },
      });
      groupIdByIndex.set(group.groupIndex, createdGroup.id);
    }

    for (const field of fields) {
      const data = normalizeFieldInput(
        field,
        field.sortOrder,
        field.groupIndex === undefined ? undefined : groupIdByIndex.get(field.groupIndex),
      );

      if (field.id) {
        const existingField = campaignType.fields.find((item) => item.id === field.id);

        if (!existingField) {
          throw new Error(`Field "${field.key}" was not found on this campaign type.`);
        }

        await tx.campaignTypeField.update({
          where: { id: field.id },
          data,
        });
      } else {
        await tx.campaignTypeField.create({
          data: {
            campaignTypeId,
            ...data,
          },
        });
      }
    }
  });

  revalidatePath("/campaign-types");
  revalidatePath(`/campaign-types/${campaignTypeId}`);
  revalidatePath("/dashboard");

  return actionSuccess({ id: campaignTypeId });
}
