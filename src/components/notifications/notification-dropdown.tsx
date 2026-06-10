"use client";

import { BellIcon } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNotificationTypeLabel } from "@/lib/notifications/labels";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";

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

export function NotificationDropdown() {
  const { notifications, unreadCount, markAllAsRead, handleNotificationClick } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
          <BellIcon className="size-4" />
          {unreadCount > 0 ? (
            <Badge className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 font-semibold">Notifications</DropdownMenuLabel>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => void markAllAsRead()}
            >
              Mark all read
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-muted-foreground text-sm">
              No notifications yet
            </p>
          ) : (
            notifications.slice(0, 20).map((notification) => {
              const actorName = notification.actor.name ?? "Someone";
              const isUnread = !notification.readAt;

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex cursor-pointer items-start gap-2 p-3"
                  onClick={() => void handleNotificationClick(notification)}
                >
                  <Avatar size="sm" className="mt-0.5">
                    {notification.actor.image ? (
                      <AvatarImage src={notification.actor.image} alt={actorName} />
                    ) : null}
                    <AvatarFallback>{getInitials(notification.actor.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={`text-sm leading-snug ${isUnread ? "font-medium" : ""}`}>
                      {getNotificationTypeLabel(notification.type, actorName)}
                    </p>
                    <p className="line-clamp-2 text-muted-foreground text-xs">
                      {notification.preview}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                  {isUnread ? (
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center text-sm">
          <Link href="/notifications">View all</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
