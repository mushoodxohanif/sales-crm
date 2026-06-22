"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { CampaignStatus } from "@/generated/prisma/client";
import { touchLeadUpdatedAt } from "@/lib/actions/leads";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import { getLeadComments } from "@/lib/data/lead-comments";
import { listWorkspaceUsers } from "@/lib/data/users";
import { db } from "@/lib/db";
import { deliverNotification } from "@/lib/notifications/deliver";
import { pusherChannels } from "@/lib/realtime/channels";
import { triggerPusherEvent } from "@/lib/realtime/pusher-server";

export type LeadCommentPayload = {
  id: string;
  leadId: string;
  body: string;
  authorId: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  mentions: Array<{
    userId: string;
    name: string | null;
  }>;
};

export type WorkspaceUserForMention = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

function serializeLeadComment(
  comment: Awaited<ReturnType<typeof getLeadComments>>[number],
): LeadCommentPayload {
  return {
    id: comment.id,
    leadId: comment.leadId,
    body: comment.body,
    authorId: comment.authorId,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author,
    mentions: comment.mentions.map((mention) => ({
      userId: mention.userId,
      name: mention.user.name,
    })),
  };
}

const createLeadCommentSchema = z.object({
  leadId: z.string().min(1),
  body: z.string().trim().min(1, "Comment cannot be empty.").max(5000),
  mentionUserIds: z.array(z.string().min(1)).default([]),
});

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function fetchLeadComments(
  leadId: string,
): Promise<ActionResult<LeadCommentPayload[]>> {
  const userId = await requireUserId();

  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  if (!leadId) {
    return actionError("Lead id is required.");
  }

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true },
  });

  if (!lead) {
    return actionError("Lead not found.");
  }

  const comments = await getLeadComments(leadId);
  return actionSuccess(comments.map(serializeLeadComment));
}

export async function fetchWorkspaceUsersForMentions(): Promise<
  ActionResult<WorkspaceUserForMention[]>
> {
  const userId = await requireUserId();

  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const users = await listWorkspaceUsers();
  return actionSuccess(users);
}

export async function createLeadComment(input: unknown): Promise<ActionResult<LeadCommentPayload>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = createLeadCommentSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { leadId, body, mentionUserIds } = parsed.data;

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      campaignId: true,
      campaign: { select: { status: true } },
    },
  });

  if (!lead) {
    return actionError("Lead not found.");
  }

  if (lead.campaign.status === CampaignStatus.ARCHIVED) {
    return actionError("Comments are disabled for archived campaigns.");
  }

  const uniqueMentionIds = [...new Set(mentionUserIds)].filter((id) => id !== userId);

  const preview = body.length > 120 ? `${body.slice(0, 117)}...` : body;

  const comment = await db.$transaction(async (tx) => {
    const created = await tx.leadComment.create({
      data: {
        leadId,
        authorId: userId,
        body,
        mentions:
          uniqueMentionIds.length > 0
            ? {
                create: uniqueMentionIds.map((userId) => ({ userId })),
              }
            : undefined,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        mentions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    await touchLeadUpdatedAt(leadId, tx);

    return created;
  });

  const priorParticipants = await db.leadComment.findMany({
    where: {
      leadId,
      authorId: { not: userId },
      id: { not: comment.id },
    },
    select: { authorId: true },
    distinct: ["authorId"],
  });

  const notifiedUserIds = new Set<string>();

  for (const mentionedUserId of uniqueMentionIds) {
    await deliverNotification({
      recipientId: mentionedUserId,
      type: "LEAD_MENTION",
      actorId: userId,
      preview,
      leadId,
      commentId: comment.id,
    });
    notifiedUserIds.add(mentionedUserId);
  }

  for (const participant of priorParticipants) {
    if (notifiedUserIds.has(participant.authorId)) {
      continue;
    }

    await deliverNotification({
      recipientId: participant.authorId,
      type: "LEAD_COMMENT",
      actorId: userId,
      preview,
      leadId,
      commentId: comment.id,
    });
    notifiedUserIds.add(participant.authorId);
  }

  await triggerPusherEvent(pusherChannels.lead(leadId), "comment:created", {
    id: comment.id,
    leadId: comment.leadId,
    body: comment.body,
    authorId: comment.authorId,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author,
    mentionUserIds: comment.mentions.map((mention) => mention.userId),
  });

  revalidatePath(`/campaigns/${lead.campaignId}`);

  return actionSuccess(serializeLeadComment(comment));
}
