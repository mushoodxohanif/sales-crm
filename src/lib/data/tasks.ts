import type { TaskSource, TaskStatus } from "@/generated/prisma/client";
import { CampaignStatus } from "@/generated/prisma/client";
import type { FieldTypeValue } from "@/lib/campaign-types/fields";
import { db } from "@/lib/db";
import { getLeadDisplayTitle, toFieldDefinitions } from "@/lib/leads/field-values";

export type TaskLeadOption = {
  id: string;
  title: string;
  campaignId: string;
  campaignName: string;
};

export type TaskRecord = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  source: TaskSource;
  leadId: string | null;
  campaignId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lead: {
    id: string;
    fieldValues: Array<{ fieldId: string; value: unknown }>;
    campaign: {
      id: string;
      name: string;
      campaignType: {
        fields: Array<{
          id: string;
          key: string;
          label: string;
          fieldType: FieldTypeValue;
          required: boolean;
          showOnKanbanCard: boolean;
          isUnique: boolean;
          sortOrder: number;
          options: unknown;
        }>;
      };
    };
  } | null;
  campaign: {
    id: string;
    name: string;
  } | null;
};

export type TaskListItem = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  source: TaskSource;
  leadId: string | null;
  leadTitle: string | null;
  campaignId: string | null;
  campaignName: string | null;
  createdAt: string;
  updatedAt: string;
};

function toTaskListItem(task: TaskRecord): TaskListItem {
  let leadTitle: string | null = null;

  if (task.lead) {
    const fields = toFieldDefinitions(task.lead.campaign.campaignType.fields);
    leadTitle = getLeadDisplayTitle(fields, task.lead.fieldValues);
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    source: task.source,
    leadId: task.leadId,
    leadTitle,
    campaignId: task.campaignId ?? task.lead?.campaign.id ?? task.campaign?.id ?? null,
    campaignName: task.campaign?.name ?? task.lead?.campaign.name ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

const taskInclude = {
  lead: {
    include: {
      fieldValues: true,
      campaign: {
        select: {
          id: true,
          name: true,
          campaignType: {
            include: {
              fields: {
                orderBy: { sortOrder: "asc" as const },
              },
            },
          },
        },
      },
    },
  },
  campaign: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export async function getUserTasks(userId: string): Promise<TaskListItem[]> {
  const tasks = await db.task.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: taskInclude,
  });

  return tasks.map((task) => toTaskListItem(task as TaskRecord));
}

export async function getTaskLeadOptions(): Promise<TaskLeadOption[]> {
  const leads = await db.lead.findMany({
    where: {
      campaign: {
        status: { not: CampaignStatus.ARCHIVED },
      },
    },
    include: {
      fieldValues: true,
      campaign: {
        select: {
          id: true,
          name: true,
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
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return leads.map((lead) => {
    const fields = toFieldDefinitions(lead.campaign.campaignType.fields);

    return {
      id: lead.id,
      title: getLeadDisplayTitle(fields, lead.fieldValues),
      campaignId: lead.campaign.id,
      campaignName: lead.campaign.name,
    };
  });
}

export async function getTaskByIdForUser(
  taskId: string,
  userId: string,
): Promise<TaskListItem | null> {
  const task = await db.task.findFirst({
    where: { id: taskId, userId },
    include: taskInclude,
  });

  if (!task) {
    return null;
  }

  return toTaskListItem(task as TaskRecord);
}
