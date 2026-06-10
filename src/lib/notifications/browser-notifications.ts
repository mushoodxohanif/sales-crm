import {
  getNotificationDeepLinkPath,
  isActiveNotificationContext,
} from "@/lib/notifications/deep-links";
import type { NotificationPayload } from "@/lib/notifications/types";

function getNotificationTitle(notification: NotificationPayload): string {
  const actorName = notification.actor.name ?? "Someone";

  switch (notification.type) {
    case "LEAD_MENTION":
      return `${actorName} mentioned you`;
    case "LEAD_COMMENT":
      return `${actorName} commented on a lead`;
    case "DIRECT_MESSAGE":
      return `${actorName} sent you a message`;
    default:
      return "New notification";
  }
}

export function shouldShowBrowserNotification(
  notification: NotificationPayload,
  options: {
    activeLeadCommentDialogId: string | null;
    activeConversationId: string | null;
    browserEnabled: boolean;
  },
): boolean {
  if (typeof window === "undefined" || !options.browserEnabled) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  if (
    isActiveNotificationContext(
      notification,
      options.activeLeadCommentDialogId,
      options.activeConversationId,
    )
  ) {
    return false;
  }

  return true;
}

export function showBrowserNotification(
  notification: NotificationPayload,
  options: {
    activeLeadCommentDialogId: string | null;
    activeConversationId: string | null;
    browserEnabled: boolean;
  },
): void {
  if (!shouldShowBrowserNotification(notification, options)) {
    return;
  }

  const title = getNotificationTitle(notification);
  const browserNotification = new Notification(title, {
    body: notification.preview,
    icon: notification.actor.image ?? undefined,
    tag: notification.id,
  });

  browserNotification.onclick = () => {
    window.focus();
    const path = getNotificationDeepLinkPath(notification);
    window.location.href = path;
    browserNotification.close();
  };
}
