import { db } from "@/lib/db";

const participantSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

export async function listConversationsForUser(userId: string) {
  const conversations = await db.conversation.findMany({
    where: {
      OR: [{ participant1Id: userId }, { participant2Id: userId }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      participant1: { select: participantSelect },
      participant2: { select: participantSelect },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          body: true,
          senderId: true,
          createdAt: true,
        },
      },
    },
  });

  if (conversations.length === 0) {
    return [];
  }

  const conversationIds = conversations.map((conversation) => conversation.id);
  const unreadCounts = await db.directMessage.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversationIds },
      senderId: { not: userId },
      readAt: null,
    },
    _count: { id: true },
  });

  const unreadByConversationId = new Map(
    unreadCounts.map((entry) => [entry.conversationId, entry._count.id]),
  );

  return conversations.map((conversation) => {
    const otherParticipant =
      conversation.participant1Id === userId
        ? conversation.participant2
        : conversation.participant1;

    return {
      id: conversation.id,
      updatedAt: conversation.updatedAt,
      otherParticipant,
      lastMessage: conversation.messages[0] ?? null,
      unreadCount: unreadByConversationId.get(conversation.id) ?? 0,
    };
  });
}

export async function getConversationForUser(conversationId: string, userId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participant1: { select: participantSelect },
      participant2: { select: participantSelect },
    },
  });

  if (!conversation) {
    return null;
  }

  const isParticipant =
    conversation.participant1Id === userId || conversation.participant2Id === userId;

  if (!isParticipant) {
    return null;
  }

  return {
    id: conversation.id,
    otherParticipant:
      conversation.participant1Id === userId
        ? conversation.participant2
        : conversation.participant1,
  };
}

const messageInclude = {
  sender: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
} as const;

export async function getConversationMessages(conversationId: string, limit = 100) {
  return db.directMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: messageInclude,
  });
}

export async function loadConversationThreadForUser(
  conversationId: string,
  userId: string,
  limit = 100,
) {
  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ participant1Id: userId }, { participant2Id: userId }],
    },
    select: { id: true },
  });

  if (!conversation) {
    return null;
  }

  const [messages] = await Promise.all([
    db.directMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: messageInclude,
    }),
    db.directMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    }),
  ]);

  return messages;
}
