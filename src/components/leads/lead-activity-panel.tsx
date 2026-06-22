"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { MentionBody } from "@/components/mentions/mention-body";
import { MentionTextarea } from "@/components/mentions/mention-textarea";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { usePusherChannel } from "@/hooks/use-pusher-channel";
import {
  createLeadComment,
  fetchLeadComments,
  fetchWorkspaceUsersForMentions,
  type LeadCommentPayload,
  type WorkspaceUserForMention,
} from "@/lib/actions/lead-comments";
import { pusherChannels } from "@/lib/realtime/channels";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";

type PusherCommentPayload = {
  id: string;
  leadId: string;
  body: string;
  authorId: string;
  createdAt: string;
  author: LeadCommentPayload["author"];
  mentionUserIds: string[];
};

interface LeadActivityPanelProps {
  leadId: string;
  active: boolean;
  disabled?: boolean;
  autoFocusInput?: boolean;
  showHeader?: boolean;
}

function getInitials(name: string | null): string {
  if (!name) {
    return "?";
  }

  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function toCommentPayload(
  data: PusherCommentPayload,
  users: WorkspaceUserForMention[],
): LeadCommentPayload {
  return {
    id: data.id,
    leadId: data.leadId,
    body: data.body,
    authorId: data.authorId,
    createdAt: data.createdAt,
    author: data.author,
    mentions: data.mentionUserIds.map((userId) => ({
      userId,
      name: users.find((user) => user.id === userId)?.name ?? null,
    })),
  };
}

export function LeadActivityPanel({
  leadId,
  active,
  disabled = false,
  autoFocusInput = false,
  showHeader = true,
}: LeadActivityPanelProps) {
  const router = useRouter();
  const { setActiveLeadCommentDialogId } = useNotifications();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState<LeadCommentPayload[]>([]);
  const [users, setUsers] = useState<WorkspaceUserForMention[]>([]);
  const [body, setBody] = useState("");
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([]);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const usersRef = useRef(users);
  usersRef.current = users;

  const appendComment = useCallback((comment: LeadCommentPayload) => {
    setComments((current) => {
      if (current.some((item) => item.id === comment.id)) {
        return current;
      }

      return [...current, comment];
    });
  }, []);

  const handleIncomingComment = useCallback(
    (data: unknown) => {
      const payload = data as PusherCommentPayload;
      appendComment(toCommentPayload(payload, usersRef.current));
    },
    [appendComment],
  );

  usePusherChannel(
    leadId ? pusherChannels.lead(leadId) : null,
    {
      "comment:created": handleIncomingComment,
    },
    active && Boolean(leadId),
  );

  useEffect(() => {
    if (!active || !leadId) {
      return;
    }

    setActiveLeadCommentDialogId(leadId);

    return () => {
      setActiveLeadCommentDialogId(null);
    };
  }, [active, leadId, setActiveLeadCommentDialogId]);

  useEffect(() => {
    if (!active || !leadId) {
      return;
    }

    let cancelled = false;

    async function loadData(leadIdToLoad: string) {
      setIsLoading(true);

      const [commentsResult, usersResult] = await Promise.all([
        fetchLeadComments(leadIdToLoad),
        fetchWorkspaceUsersForMentions(),
      ]);

      if (cancelled) {
        return;
      }

      if (commentsResult.success) {
        setComments(commentsResult.data);
      } else {
        toast.error(commentsResult.error);
      }

      if (usersResult.success) {
        setUsers(usersResult.data);
      }

      setIsLoading(false);
    }

    void loadData(leadId);

    return () => {
      cancelled = true;
    };
  }, [active, leadId]);

  useEffect(() => {
    if (!active) {
      setBody("");
      setMentionUserIds([]);
      setComments([]);
    }
  }, [active]);

  useEffect(() => {
    if (!active || comments.length === 0) {
      return;
    }

    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active, comments.length]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await createLeadComment({
        leadId,
        body: body.trim(),
        mentionUserIds,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      appendComment(result.data);
      setBody("");
      setMentionUserIds([]);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showHeader ? (
        <div className="shrink-0 border-b px-4 py-3">
          <h3 className="font-medium text-sm">Activity</h3>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            No activity yet. Write a comment below.
          </p>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => {
              const authorName = comment.author.name ?? "Someone";

              return (
                <li key={comment.id} className="flex gap-3">
                  <Avatar size="sm" className="mt-0.5 shrink-0">
                    <AvatarImage src={comment.author.image ?? undefined} alt={authorName} />
                    <AvatarFallback>{getInitials(comment.author.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-medium text-sm">{authorName}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      <MentionBody body={comment.body} mentions={comment.mentions} />
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={threadEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 space-y-2 border-t bg-background/50 p-4">
        <MentionTextarea
          users={users}
          value={body}
          mentionUserIds={mentionUserIds}
          onValueChange={setBody}
          onMentionUserIdsChange={setMentionUserIds}
          disabled={disabled || isPending}
          placeholder="Write a comment..."
          autoFocus={autoFocusInput}
          className="min-h-[72px] resize-none"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={disabled || isPending || !body.trim()}>
            {isPending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Posting...
              </>
            ) : (
              "Comment"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
