"use client";

import { Loader2Icon, MessageSquarePlusIcon, SendIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePusherChannel } from "@/hooks/use-pusher-channel";
import {
  type ConversationSummaryPayload,
  type DirectMessagePayload,
  fetchConversationMessages,
  fetchConversations,
  getOrCreateConversation,
  markConversationRead,
  sendDirectMessage,
  type WorkspaceUserForMessage,
} from "@/lib/actions/messages";
import { pusherChannels } from "@/lib/realtime/channels";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";

type PusherMessagePayload = {
  id: string;
  conversationId: string;
  body: string;
  senderId: string;
  createdAt: string;
  sender: DirectMessagePayload["sender"];
};

interface MessagesViewProps {
  currentUserId: string;
  initialConversations: ConversationSummaryPayload[];
  users: WorkspaceUserForMessage[];
  initialConversationId?: string;
  targetUserId?: string;
}

function getInitials(name: string | null, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }

    return (parts[0]?.[0] ?? "?").toUpperCase();
  }

  return (email?.[0] ?? "?").toUpperCase();
}

function getDisplayName(user: { name: string | null; email: string }): string {
  return user.name ?? user.email;
}

function truncatePreview(body: string, maxLength = 80): string {
  if (body.length <= maxLength) {
    return body;
  }

  return `${body.slice(0, maxLength - 3)}...`;
}

function toDirectMessagePayload(data: PusherMessagePayload): DirectMessagePayload {
  return {
    id: data.id,
    conversationId: data.conversationId,
    body: data.body,
    senderId: data.senderId,
    createdAt: data.createdAt,
    readAt: null,
    sender: data.sender,
  };
}

function sortConversations(
  conversations: ConversationSummaryPayload[],
): ConversationSummaryPayload[] {
  return [...conversations].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function upsertConversationSummary(
  conversations: ConversationSummaryPayload[],
  conversationId: string,
  updater: (current: ConversationSummaryPayload | undefined) => ConversationSummaryPayload,
): ConversationSummaryPayload[] {
  const existing = conversations.find((conversation) => conversation.id === conversationId);
  const nextConversation = updater(existing);

  if (existing) {
    return sortConversations(
      conversations.map((conversation) =>
        conversation.id === conversationId ? nextConversation : conversation,
      ),
    );
  }

  return sortConversations([nextConversation, ...conversations]);
}

export function MessagesView({
  currentUserId,
  initialConversations,
  users,
  initialConversationId,
  targetUserId,
}: MessagesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setActiveConversationId } = useNotifications();
  const [isPending, startTransition] = useTransition();
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [messages, setMessages] = useState<DirectMessagePayload[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const handledTargetUserRef = useRef<string | null>(null);

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  const appendMessage = useCallback((message: DirectMessagePayload) => {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) {
        return current;
      }

      return [...current, message];
    });
  }, []);

  const updateConversationFromMessage = useCallback(
    (message: DirectMessagePayload, options?: { incrementUnread?: boolean }) => {
      setConversations((current) => {
        const existing = current.find((conversation) => conversation.id === message.conversationId);

        if (!existing) {
          return current;
        }

        const isIncoming = message.senderId !== currentUserId;
        const isActiveConversation = message.conversationId === selectedConversationId;
        const shouldIncrementUnread =
          options?.incrementUnread ?? (isIncoming && !isActiveConversation);

        return upsertConversationSummary(current, message.conversationId, () => ({
          ...existing,
          updatedAt: message.createdAt,
          lastMessage: {
            id: message.id,
            body: message.body,
            senderId: message.senderId,
            createdAt: message.createdAt,
          },
          unreadCount: shouldIncrementUnread
            ? existing.unreadCount + 1
            : isActiveConversation && isIncoming
              ? 0
              : existing.unreadCount,
        }));
      });
    },
    [currentUserId, selectedConversationId],
  );

  const handleIncomingMessage = useCallback(
    (data: unknown) => {
      const payload = data as PusherMessagePayload;
      const message = toDirectMessagePayload(payload);

      if (payload.conversationId === selectedConversationId) {
        appendMessage(message);

        if (payload.senderId !== currentUserId) {
          void markConversationRead({ conversationId: payload.conversationId });
        }
      }

      updateConversationFromMessage(message);
    },
    [appendMessage, currentUserId, selectedConversationId, updateConversationFromMessage],
  );

  const handleMessagesRead = useCallback(
    (data: unknown) => {
      const payload = data as { conversationId: string; readerId: string };

      if (payload.readerId !== currentUserId) {
        return;
      }

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === payload.conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );
    },
    [currentUserId],
  );

  usePusherChannel(
    selectedConversationId ? pusherChannels.conversation(selectedConversationId) : null,
    {
      "message:created": handleIncomingMessage,
      "message:read": handleMessagesRead,
    },
    Boolean(selectedConversationId),
  );

  const selectConversation = useCallback(
    (conversationId: string, options?: { replace?: boolean }) => {
      setSelectedConversationId(conversationId);

      const params = new URLSearchParams(searchParams.toString());
      params.set("conversation", conversationId);
      params.delete("user");

      const nextUrl = `/messages?${params.toString()}`;
      if (options?.replace) {
        router.replace(nextUrl);
      } else {
        router.push(nextUrl);
      }
    },
    [router, searchParams],
  );

  const loadMessages = useCallback(
    async (conversationId: string) => {
      setIsLoadingMessages(true);

      const result = await fetchConversationMessages(conversationId);

      if (result.success) {
        setMessages(result.data);
      } else {
        toast.error(result.error);
        setMessages([]);
        setSelectedConversationId(null);
        router.push("/messages");
      }

      setIsLoadingMessages(false);
    },
    [router],
  );

  useEffect(() => {
    if (!selectedConversationId) {
      setActiveConversationId(null);
      setMessages([]);
      return;
    }

    setActiveConversationId(selectedConversationId);

    void loadMessages(selectedConversationId);
    void markConversationRead({ conversationId: selectedConversationId }).then((result) => {
      if (result.success) {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedConversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
      }
    });

    return () => {
      setActiveConversationId(null);
    };
  }, [loadMessages, selectedConversationId, setActiveConversationId]);

  useEffect(() => {
    if (!targetUserId || handledTargetUserRef.current === targetUserId) {
      return;
    }

    handledTargetUserRef.current = targetUserId;

    async function openConversationWithUser(otherUserId: string) {
      setIsCreatingConversation(true);

      const result = await getOrCreateConversation({ otherUserId });

      if (!result.success) {
        toast.error(result.error);
        setIsCreatingConversation(false);
        return;
      }

      const conversationsResult = await fetchConversations();

      if (conversationsResult.success) {
        setConversations(conversationsResult.data);
      }

      selectConversation(result.data.id, { replace: true });
      setIsCreatingConversation(false);
    }

    void openConversationWithUser(targetUserId);
  }, [selectConversation, targetUserId]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleStartConversation(otherUserId: string) {
    setIsCreatingConversation(true);

    const result = await getOrCreateConversation({ otherUserId });

    if (!result.success) {
      toast.error(result.error);
      setIsCreatingConversation(false);
      return;
    }

    const conversationsResult = await fetchConversations();

    if (conversationsResult.success) {
      setConversations(conversationsResult.data);
    }

    setNewConversationOpen(false);
    setUserSearch("");
    selectConversation(result.data.id);
    setIsCreatingConversation(false);
  }

  function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedConversationId || !messageBody.trim()) {
      return;
    }

    const body = messageBody.trim();

    startTransition(async () => {
      const result = await sendDirectMessage({
        conversationId: selectedConversationId,
        body,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const message: DirectMessagePayload = {
        id: result.data.id,
        conversationId: result.data.conversationId,
        body: result.data.body,
        senderId: result.data.senderId,
        createdAt: result.data.createdAt,
        readAt: null,
        sender: {
          id: currentUserId,
          name: null,
          image: null,
        },
      };

      appendMessage(message);
      updateConversationFromMessage(message, { incrementUnread: false });
      setMessageBody("");
    });
  }

  const filteredUsers = users.filter((user) => {
    const query = userSearch.trim().toLowerCase();

    if (!query) {
      return true;
    }

    const name = user.name?.toLowerCase() ?? "";
    const email = user.email.toLowerCase();

    return name.includes(query) || email.includes(query);
  });

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <section
        className={cn(
          "flex w-full flex-col border-r md:w-80 lg:w-96",
          selectedConversationId ? "hidden md:flex" : "flex",
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">Messages</h1>
            <p className="text-muted-foreground text-sm">Direct messages with your team</p>
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="New conversation"
            onClick={() => setNewConversationOpen(true)}
          >
            <MessageSquarePlusIcon />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isCreatingConversation && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-muted-foreground text-sm">No conversations yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setNewConversationOpen(true)}
              >
                Start a conversation
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {conversations.map((conversation) => {
                const otherUser = conversation.otherParticipant;
                const displayName = getDisplayName(otherUser);
                const isSelected = conversation.id === selectedConversationId;
                const preview = conversation.lastMessage
                  ? conversation.lastMessage.senderId === currentUserId
                    ? `You: ${truncatePreview(conversation.lastMessage.body)}`
                    : truncatePreview(conversation.lastMessage.body)
                  : "No messages yet";

                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                        isSelected && "bg-muted",
                      )}
                      onClick={() => selectConversation(conversation.id)}
                    >
                      <Avatar size="sm" className="mt-0.5">
                        {otherUser.image ? (
                          <AvatarImage src={otherUser.image} alt={displayName} />
                        ) : null}
                        <AvatarFallback>
                          {getInitials(otherUser.name, otherUser.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              "truncate text-sm",
                              conversation.unreadCount > 0 && "font-semibold",
                            )}
                          >
                            {displayName}
                          </p>
                          {conversation.lastMessage ? (
                            <span className="text-muted-foreground shrink-0 text-xs">
                              {formatRelativeTime(conversation.lastMessage.createdAt)}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              "truncate text-sm",
                              conversation.unreadCount > 0
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {preview}
                          </p>
                          {conversation.unreadCount > 0 ? (
                            <Badge className="shrink-0">{conversation.unreadCount}</Badge>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          selectedConversationId ? "flex" : "hidden md:flex",
        )}
      >
        {selectedConversation ? (
          <>
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => {
                  setSelectedConversationId(null);
                  router.push("/messages");
                }}
              >
                Back
              </Button>
              <Avatar size="sm">
                {selectedConversation.otherParticipant.image ? (
                  <AvatarImage
                    src={selectedConversation.otherParticipant.image}
                    alt={getDisplayName(selectedConversation.otherParticipant)}
                  />
                ) : null}
                <AvatarFallback>
                  {getInitials(
                    selectedConversation.otherParticipant.name,
                    selectedConversation.otherParticipant.email,
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {getDisplayName(selectedConversation.otherParticipant)}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {selectedConversation.otherParticipant.email}
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2Icon className="size-5 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground text-sm">
                  No messages yet. Say hello below.
                </p>
              ) : (
                <ul className="space-y-4">
                  {messages.map((message) => {
                    const isOwnMessage = message.senderId === currentUserId;
                    const senderName = isOwnMessage
                      ? "You"
                      : (message.sender.name ??
                        getDisplayName(selectedConversation.otherParticipant));

                    return (
                      <li
                        key={message.id}
                        className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] space-y-1 rounded-2xl px-3 py-2",
                            isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted",
                          )}
                        >
                          {!isOwnMessage ? (
                            <p className="font-medium text-xs">{senderName}</p>
                          ) : null}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.body}
                          </p>
                          <p
                            className={cn(
                              "text-xs",
                              isOwnMessage ? "text-primary-foreground/80" : "text-muted-foreground",
                            )}
                          >
                            {formatRelativeTime(message.createdAt)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div ref={threadEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="border-t p-4">
              <div className="flex items-end gap-2">
                <Textarea
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                  placeholder="Write a message..."
                  rows={2}
                  className="min-h-[72px] resize-none"
                  disabled={isPending}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isPending || !messageBody.trim()}
                  aria-label="Send message"
                >
                  {isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MessageSquarePlusIcon className="text-muted-foreground mb-4 size-10" />
            <h2 className="text-lg font-medium">Select a conversation</h2>
            <p className="text-muted-foreground mt-2 max-w-sm text-sm">
              Choose an existing conversation or start a new one with someone on your team.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setNewConversationOpen(true)}>
              New conversation
            </Button>
          </div>
        )}
      </section>

      <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New conversation</DialogTitle>
            <DialogDescription>Choose a team member to message.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search by name or email..."
            />
            <div className="max-h-72 overflow-y-auto rounded-lg border">
              {filteredUsers.length === 0 ? (
                <p className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No team members found.
                </p>
              ) : (
                <ul className="divide-y">
                  {filteredUsers.map((user) => {
                    const displayName = getDisplayName(user);

                    return (
                      <li key={user.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                          disabled={isCreatingConversation}
                          onClick={() => void handleStartConversation(user.id)}
                        >
                          <Avatar size="sm">
                            {user.image ? <AvatarImage src={user.image} alt={displayName} /> : null}
                            <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-sm">{displayName}</p>
                            <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
