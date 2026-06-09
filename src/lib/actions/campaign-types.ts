"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { FieldType, type Prisma } from "@/generated/prisma/client";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import { db } from "@/lib/db";
import {
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

function normalizeFieldInput(field: CampaignTypeFieldInput, sortOrder: number) {
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
    sortOrder,
    options: options ? (options as Prisma.InputJsonValue) : undefined,
  };
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

  const { name, slug, description, fields } = parsed.data;

  const existing = await db.campaignType.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing) {
    return actionError("A campaign type with this slug already exists.");
  }

  const keys = fields.map((field) => field.key);
  if (new Set(keys).size !== keys.length) {
    return actionError("Field keys must be unique within a campaign type.");
  }

  const campaignType = await db.campaignType.create({
    data: {
      name,
      slug,
      description,
      fields: {
        create: fields.map((field, index) => normalizeFieldInput(field, index)),
      },
    },
    select: { id: true },
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

  const { campaignTypeId, fields } = parsed.data;

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
    },
  });

  if (!campaignType) {
    return actionError("Campaign type not found.");
  }

  const keys = fields.map((field) => field.key);
  if (new Set(keys).size !== keys.length) {
    return actionError("Field keys must be unique within a campaign type.");
  }

  const incomingIds = new Set(fields.flatMap((field) => (field.id ? [field.id] : [])));
  const fieldsToRemove = campaignType.fields.filter((field) => !incomingIds.has(field.id));

  for (const field of fieldsToRemove) {
    if (field._count.fieldValues > 0) {
      return actionError(
        `Cannot remove field "${field.key}" because leads already have values for it.`,
      );
    }
  }

  await db.$transaction(async (tx) => {
    if (fieldsToRemove.length > 0) {
      await tx.campaignTypeField.deleteMany({
        where: {
          id: { in: fieldsToRemove.map((field) => field.id) },
        },
      });
    }

    for (const [index, field] of fields.entries()) {
      const data = normalizeFieldInput(field, index);

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
