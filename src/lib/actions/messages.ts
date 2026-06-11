"use server";

import { after } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import {
  type getConversationMessages,
  listConversationsForUser,
  loadConversationThreadForUser,
} from "@/lib/data/conversations";
import { listWorkspaceUsers } from "@/lib/data/users";
import { db } from "@/lib/db";
import { deliverNotification } from "@/lib/notifications/deliver";
import { pusherChannels } from "@/lib/realtime/channels";
import { triggerPusherEvent } from "@/lib/realtime/pusher-server";

export type ConversationParticipantPayload = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export type ConversationSummaryPayload = {
  id: string;
  updatedAt: string;
  unreadCount: number;
  otherParticipant: ConversationParticipantPayload;
  lastMessage: {
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
  } | null;
};

export type DirectMessagePayload = {
  id: string;
  conversationId: string;
  body: string;
  senderId: string;
  createdAt: string;
  readAt: string | null;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export type WorkspaceUserForMessage = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

function serializeConversationSummary(
  conversation: Awaited<ReturnType<typeof listConversationsForUser>>[number],
): ConversationSummaryPayload {
  return {
    id: conversation.id,
    updatedAt: conversation.updatedAt.toISOString(),
    unreadCount: conversation.unreadCount,
    otherParticipant: conversation.otherParticipant,
    lastMessage: conversation.lastMessage
      ? {
          id: conversation.lastMessage.id,
          body: conversation.lastMessage.body,
          senderId: conversation.lastMessage.senderId,
          createdAt: conversation.lastMessage.createdAt.toISOString(),
        }
      : null,
  };
}

function serializeDirectMessage(
  message: Awaited<ReturnType<typeof getConversationMessages>>[number],
): DirectMessagePayload {
  return {
    id: message.id,
    conversationId: message.conversationId,
    body: message.body,
    senderId: message.senderId,
    createdAt: message.createdAt.toISOString(),
    readAt: message.readAt?.toISOString() ?? null,
    sender: message.sender,
  };
}

function canonicalPair(userIdA: string, userIdB: string): [string, string] {
  return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
}

const otherUserIdSchema = z.object({
  otherUserId: z.string().min(1),
});

const sendDirectMessageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, "Message cannot be empty.").max(5000),
});

const conversationIdSchema = z.object({
  conversationId: z.string().min(1),
});

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function fetchConversations(): Promise<ActionResult<ConversationSummaryPayload[]>> {
  const userId = await requireUserId();

  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const conversations = await listConversationsForUser(userId);
  return actionSuccess(conversations.map(serializeConversationSummary));
}

export async function fetchConversationMessages(
  conversationId: string,
): Promise<ActionResult<DirectMessagePayload[]>> {
  const userId = await requireUserId();

  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  if (!conversationId) {
    return actionError("Conversation id is required.");
  }

  const messages = await loadConversationThreadForUser(conversationId, userId);

  if (!messages) {
    return actionError("Conversation not found.");
  }

  after(() => {
    void triggerPusherEvent(pusherChannels.conversation(conversationId), "message:read", {
      conversationId,
      readerId: userId,
    });
  });

  return actionSuccess(messages.map(serializeDirectMessage));
}

export async function fetchWorkspaceUsersForMessages(): Promise<
  ActionResult<WorkspaceUserForMessage[]>
> {
  const userId = await requireUserId();

  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const users = await listWorkspaceUsers();
  return actionSuccess(
    users
      .filter((user) => user.id !== userId)
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      })),
  );
}

export async function getOrCreateConversation(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = otherUserIdSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  if (parsed.data.otherUserId === userId) {
    return actionError("You cannot start a conversation with yourself.");
  }

  const otherUser = await db.user.findUnique({
    where: { id: parsed.data.otherUserId },
    select: { id: true },
  });

  if (!otherUser) {
    return actionError("User not found.");
  }

  const [participant1Id, participant2Id] = canonicalPair(userId, parsed.data.otherUserId);

  const conversation = await db.conversation.upsert({
    where: {
      participant1Id_participant2Id: { participant1Id, participant2Id },
    },
    create: { participant1Id, participant2Id },
    update: {},
    select: { id: true },
  });

  return actionSuccess({ id: conversation.id });
}

export async function sendDirectMessage(input: unknown): Promise<
  ActionResult<{
    id: string;
    conversationId: string;
    body: string;
    senderId: string;
    createdAt: string;
  }>
> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = sendDirectMessageSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const conversation = await db.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    select: { id: true, participant1Id: true, participant2Id: true },
  });

  if (!conversation) {
    return actionError("Conversation not found.");
  }

  const isParticipant =
    conversation.participant1Id === userId || conversation.participant2Id === userId;

  if (!isParticipant) {
    return actionError("You are not a participant in this conversation.");
  }

  const recipientId =
    conversation.participant1Id === userId
      ? conversation.participant2Id
      : conversation.participant1Id;

  const preview =
    parsed.data.body.length > 120 ? `${parsed.data.body.slice(0, 117)}...` : parsed.data.body;

  const message = await db.$transaction(async (tx) => {
    const created = await tx.directMessage.create({
      data: {
        conversationId: parsed.data.conversationId,
        senderId: userId,
        body: parsed.data.body,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
    });

    await tx.conversation.update({
      where: { id: parsed.data.conversationId },
      data: { updatedAt: new Date() },
    });

    return created;
  });

  const pusherPayload = {
    id: message.id,
    conversationId: message.conversationId,
    body: message.body,
    senderId: message.senderId,
    createdAt: message.createdAt.toISOString(),
    sender: message.sender,
  };

  after(async () => {
    await Promise.all([
      deliverNotification({
        recipientId,
        type: "DIRECT_MESSAGE",
        actorId: userId,
        preview,
        conversationId: parsed.data.conversationId,
        messageId: message.id,
      }),
      triggerPusherEvent(
        pusherChannels.conversation(parsed.data.conversationId),
        "message:created",
        pusherPayload,
      ),
    ]);
  });

  return actionSuccess({
    id: message.id,
    conversationId: message.conversationId,
    body: message.body,
    senderId: message.senderId,
    createdAt: message.createdAt.toISOString(),
  });
}

export async function markConversationRead(input: unknown): Promise<ActionResult<void>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = conversationIdSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const conversation = await db.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    select: { participant1Id: true, participant2Id: true },
  });

  if (!conversation) {
    return actionError("Conversation not found.");
  }

  const isParticipant =
    conversation.participant1Id === userId || conversation.participant2Id === userId;

  if (!isParticipant) {
    return actionError("You are not a participant in this conversation.");
  }

  await db.directMessage.updateMany({
    where: {
      conversationId: parsed.data.conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  after(() => {
    void triggerPusherEvent(
      pusherChannels.conversation(parsed.data.conversationId),
      "message:read",
      { conversationId: parsed.data.conversationId, readerId: userId },
    );
  });

  return actionSuccess(undefined);
}
