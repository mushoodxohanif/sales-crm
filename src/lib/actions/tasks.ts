"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { CampaignStatus, TaskSource } from "@/generated/prisma/client";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { formatTaskFromRawInput } from "@/lib/ai/task-formatter";
import {
  getTaskByIdForUser,
  getTaskLeadOptions,
  getUserTasks,
  type TaskListItem,
} from "@/lib/data/tasks";
import { db } from "@/lib/db";
import {
  fieldValuesToMap,
  formatFieldValueForDisplay,
  toFieldDefinitions,
} from "@/lib/leads/field-values";
import {
  createTaskFromAISchema,
  createTaskSchema,
  deleteTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "@/lib/validators/task";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Invalid input.";
}

function revalidateTaskPaths() {
  revalidatePath("/tasks");
}

async function getLeadForTaskLink(leadId: string) {
  return db.lead.findUnique({
    where: { id: leadId },
    include: {
      fieldValues: true,
      campaign: {
        select: {
          id: true,
          status: true,
          campaignType: {
            include: {
              fields: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
  });
}

function buildLeadContext(
  fields: ReturnType<typeof toFieldDefinitions>,
  fieldValues: Array<{ fieldId: string; value: unknown }>,
): Record<string, string> {
  const valueMap = fieldValuesToMap(fieldValues);
  const context: Record<string, string> = {};

  for (const field of fields) {
    const value = valueMap[field.id];

    if (value === null || value === undefined || value === "") {
      continue;
    }

    context[field.label] = formatFieldValueForDisplay(value);
  }

  return context;
}

async function resolveLeadLink(
  leadId: string | null | undefined,
): Promise<ActionResult<{ leadId: string | null; campaignId: string | null }>> {
  if (!leadId) {
    return actionSuccess({ leadId: null, campaignId: null });
  }

  const lead = await getLeadForTaskLink(leadId);

  if (!lead) {
    return actionError("Lead not found.");
  }

  if (lead.campaign.status === CampaignStatus.ARCHIVED) {
    return actionError("Cannot link tasks to leads in an archived campaign.");
  }

  return actionSuccess({
    leadId: lead.id,
    campaignId: lead.campaign.id,
  });
}

export type TaskItem = TaskListItem;
export type TaskLeadOption = Awaited<ReturnType<typeof getTaskLeadOptions>>[number];

export async function createTask(input: unknown): Promise<ActionResult<TaskItem>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const linkResult = await resolveLeadLink(parsed.data.leadId);
  if (!linkResult.success) {
    return linkResult;
  }

  const task = await db.task.create({
    data: {
      userId,
      title: parsed.data.title,
      description: parsed.data.description,
      leadId: linkResult.data.leadId,
      campaignId: linkResult.data.campaignId,
      source: TaskSource.MANUAL,
    },
  });

  revalidateTaskPaths();

  const created = await getTaskByIdForUser(task.id, userId);
  if (!created) {
    return actionError("Failed to load created task.");
  }

  return actionSuccess(created);
}

export async function updateTask(input: unknown): Promise<ActionResult<TaskItem>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const existing = await db.task.findFirst({
    where: {
      id: parsed.data.id,
      userId,
    },
    select: { id: true },
  });

  if (!existing) {
    return actionError("Task not found.");
  }

  let leadId: string | null | undefined;
  let campaignId: string | null | undefined;

  if (parsed.data.leadId !== undefined) {
    const linkResult = await resolveLeadLink(parsed.data.leadId);
    if (!linkResult.success) {
      return linkResult;
    }

    leadId = linkResult.data.leadId;
    campaignId = linkResult.data.campaignId;
  }

  await db.task.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(leadId !== undefined ? { leadId } : {}),
      ...(campaignId !== undefined ? { campaignId } : {}),
    },
  });

  revalidateTaskPaths();

  const updated = await getTaskByIdForUser(parsed.data.id, userId);
  if (!updated) {
    return actionError("Failed to load updated task.");
  }

  return actionSuccess(updated);
}

export async function updateTaskStatus(input: unknown): Promise<ActionResult<TaskItem>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const existing = await db.task.findFirst({
    where: {
      id: parsed.data.id,
      userId,
    },
    select: { id: true },
  });

  if (!existing) {
    return actionError("Task not found.");
  }

  await db.task.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  revalidateTaskPaths();

  const updated = await getTaskByIdForUser(parsed.data.id, userId);
  if (!updated) {
    return actionError("Failed to load updated task.");
  }

  return actionSuccess(updated);
}

export async function deleteTask(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = deleteTaskSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const existing = await db.task.findFirst({
    where: {
      id: parsed.data.id,
      userId,
    },
    select: { id: true },
  });

  if (!existing) {
    return actionError("Task not found.");
  }

  await db.task.delete({
    where: { id: parsed.data.id },
  });

  revalidateTaskPaths();
  return actionSuccess(undefined);
}

export async function createTaskFromAI(input: unknown): Promise<ActionResult<TaskItem>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  if (!isGeminiConfigured()) {
    return actionError("GEMINI_API_KEY is not configured. Add it to enable AI task creation.");
  }

  const parsed = createTaskFromAISchema.safeParse(input);
  if (!parsed.success) {
    return actionError(formatZodError(parsed.error));
  }

  const linkResult = await resolveLeadLink(parsed.data.leadId);
  if (!linkResult.success) {
    return linkResult;
  }

  let leadContext: Record<string, string> | undefined;

  if (parsed.data.leadId) {
    const lead = await getLeadForTaskLink(parsed.data.leadId);

    if (lead) {
      const fields = toFieldDefinitions(lead.campaign.campaignType.fields);
      leadContext = buildLeadContext(fields, lead.fieldValues);
    }
  }

  try {
    const formatted = await formatTaskFromRawInput({
      rawInput: parsed.data.rawInput,
      leadContext,
    });

    const task = await db.task.create({
      data: {
        userId,
        title: formatted.title,
        description: formatted.description,
        leadId: linkResult.data.leadId,
        campaignId: linkResult.data.campaignId,
        source: TaskSource.AI_GENERATED,
      },
    });

    revalidateTaskPaths();

    const created = await getTaskByIdForUser(task.id, userId);
    if (!created) {
      return actionError("Failed to load created task.");
    }

    return actionSuccess(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create task from AI.";
    return actionError(message);
  }
}

export async function getTasksPageData(): Promise<
  ActionResult<{
    tasks: TaskItem[];
    leads: TaskLeadOption[];
  }>
> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const [tasks, leads] = await Promise.all([getUserTasks(userId), getTaskLeadOptions()]);

  return actionSuccess({ tasks, leads });
}
