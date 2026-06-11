import { Loader2Icon } from "lucide-react";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { MessagesView } from "@/components/messages/messages-view";
import { listConversationsForUser, loadConversationThreadForUser } from "@/lib/data/conversations";
import { listWorkspaceUsers } from "@/lib/data/users";
import { pusherChannels } from "@/lib/realtime/channels";
import { triggerPusherEvent } from "@/lib/realtime/pusher-server";

interface MessagesPageProps {
  searchParams: Promise<{ conversation?: string; user?: string }>;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const { conversation: initialConversationId, user: targetUserId } = await searchParams;
  const currentUserId = session.user.id;

  const [conversations, users, initialThreadMessages] = await Promise.all([
    listConversationsForUser(currentUserId),
    listWorkspaceUsers(),
    initialConversationId
      ? loadConversationThreadForUser(initialConversationId, currentUserId)
      : Promise.resolve(null),
  ]);

  if (initialConversationId && initialThreadMessages) {
    after(() => {
      void triggerPusherEvent(pusherChannels.conversation(initialConversationId), "message:read", {
        conversationId: initialConversationId,
        readerId: currentUserId,
      });
    });
  }

  const initialConversations = conversations.map((conversation) => ({
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
  }));

  const messageUsers = users
    .filter((user) => user.id !== currentUserId)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    }));

  const initialMessages =
    initialConversationId && initialThreadMessages
      ? initialThreadMessages.map((message) => ({
          id: message.id,
          conversationId: message.conversationId,
          body: message.body,
          senderId: message.senderId,
          createdAt: message.createdAt.toISOString(),
          readAt: message.readAt?.toISOString() ?? null,
          sender: message.sender,
        }))
      : [];

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
        </div>
      }
    >
      <MessagesView
        currentUserId={currentUserId}
        currentUser={{
          name: session.user.name ?? null,
          image: session.user.image ?? null,
        }}
        initialConversations={initialConversations}
        users={messageUsers}
        initialConversationId={initialConversationId}
        initialMessages={initialMessages}
        targetUserId={targetUserId}
      />
    </Suspense>
  );
}
