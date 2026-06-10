"use client";

import { useNotifications } from "@/components/notifications/notification-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

export default function NotificationsPage() {
  const { notifications, unreadCount, markAllAsRead, handleNotificationClick } = useNotifications();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Notifications</h1>
          {unreadCount > 0 ? (
            <p className="text-muted-foreground text-sm">{unreadCount} unread</p>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <Button variant="outline" size="sm" onClick={() => void markAllAsRead()}>
            Mark all read
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-12 text-center text-muted-foreground text-sm">
            No notifications yet
          </p>
        ) : (
          <ul className="divide-y">
            {notifications.map((notification) => {
              const actorName = notification.actor.name ?? "Someone";
              const isUnread = !notification.readAt;

              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    onClick={() => void handleNotificationClick(notification)}
                  >
                    <Avatar size="sm" className="mt-0.5">
                      {notification.actor.image ? (
                        <AvatarImage src={notification.actor.image} alt={actorName} />
                      ) : null}
                      <AvatarFallback>{getInitials(notification.actor.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className={`text-sm ${isUnread ? "font-medium" : ""}`}>
                        {getNotificationTypeLabel(notification.type, actorName)}
                      </p>
                      <p className="text-muted-foreground text-sm">{notification.preview}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    {isUnread ? (
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
