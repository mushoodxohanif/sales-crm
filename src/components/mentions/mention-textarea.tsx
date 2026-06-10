"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceUserForMention } from "@/lib/actions/lead-comments";
import { cn } from "@/lib/utils";

interface MentionTextareaProps {
  users: WorkspaceUserForMention[];
  value: string;
  mentionUserIds: string[];
  onValueChange: (value: string) => void;
  onMentionUserIdsChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

function getDisplayName(user: WorkspaceUserForMention): string {
  return user.name?.trim() || user.email?.trim() || "User";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function getMentionQuery(value: string, cursor: number): { query: string; start: number } | null {
  const textBeforeCursor = value.slice(0, cursor);
  const atIndex = textBeforeCursor.lastIndexOf("@");

  if (atIndex === -1) {
    return null;
  }

  const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";

  if (charBeforeAt !== " " && charBeforeAt !== "\n" && atIndex !== 0) {
    return null;
  }

  const query = textBeforeCursor.slice(atIndex + 1);

  if (query.includes(" ") || query.includes("\n")) {
    return null;
  }

  return { query, start: atIndex };
}

export function MentionTextarea({
  users,
  value,
  mentionUserIds,
  onValueChange,
  onMentionUserIdsChange,
  disabled = false,
  placeholder = "Write a comment...",
  className,
  autoFocus = false,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionState, setMentionState] = useState<{
    query: string;
    start: number;
  } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredUsers = useMemo(() => {
    if (!mentionState) {
      return [];
    }

    const query = mentionState.query.toLowerCase();

    return users
      .filter((user) => {
        const name = getDisplayName(user).toLowerCase();
        const email = user.email?.toLowerCase() ?? "";
        return name.includes(query) || email.includes(query);
      })
      .slice(0, 8);
  }, [mentionState, users]);

  const updateMentionState = useCallback((nextValue: string, cursor: number) => {
    const nextMentionState = getMentionQuery(nextValue, cursor);

    setMentionState(nextMentionState);
    setHighlightedIndex(0);
  }, []);

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const nextValue = event.target.value;
    onValueChange(nextValue);
    updateMentionState(nextValue, event.target.selectionStart ?? nextValue.length);
  }

  function handleSelectUser(user: WorkspaceUserForMention) {
    if (!mentionState || !textareaRef.current) {
      return;
    }

    const displayName = getDisplayName(user);
    const before = value.slice(0, mentionState.start);
    const after = value.slice(textareaRef.current.selectionStart);
    const mentionText = `@${displayName} `;
    const nextValue = `${before}${mentionText}${after}`;
    const nextCursor = before.length + mentionText.length;

    onValueChange(nextValue);

    if (!mentionUserIds.includes(user.id)) {
      onMentionUserIdsChange([...mentionUserIds, user.id]);
    }

    setMentionState(null);
    setHighlightedIndex(0);

    requestAnimationFrame(() => {
      if (!textareaRef.current) {
        return;
      }

      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mentionState || filteredUsers.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((index) => (index + 1) % filteredUsers.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => (index - 1 + filteredUsers.length) % filteredUsers.length);
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const selectedUser = filteredUsers[highlightedIndex];

      if (selectedUser) {
        handleSelectUser(selectedUser);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setMentionState(null);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(event) =>
          updateMentionState(value, event.currentTarget.selectionStart ?? value.length)
        }
        onKeyUp={(event) =>
          updateMentionState(value, event.currentTarget.selectionStart ?? value.length)
        }
        disabled={disabled}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={3}
        className="min-h-20 resize-none"
      />

      {mentionState && filteredUsers.length > 0 ? (
        <div
          className="absolute bottom-full left-0 z-50 mb-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md"
          role="listbox"
        >
          {filteredUsers.map((user, index) => {
            const displayName = getDisplayName(user);

            return (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={index === highlightedIndex}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                  index === highlightedIndex && "bg-muted",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelectUser(user);
                }}
              >
                <Avatar size="sm">
                  <AvatarImage src={user.image ?? undefined} alt={displayName} />
                  <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{displayName}</p>
                  {user.email ? (
                    <p className="truncate text-muted-foreground text-xs">{user.email}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
