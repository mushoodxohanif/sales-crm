import type { NotificationPayload } from "@/lib/notifications/types";

function getBaseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export function getNotificationDeepLinkPath(notification: NotificationPayload): string {
  switch (notification.type) {
    case "LEAD_MENTION":
    case "LEAD_COMMENT": {
      if (notification.campaignId && notification.leadId) {
        return `/campaigns/${notification.campaignId}?commentLead=${notification.leadId}`;
      }
      return "/campaigns";
    }
    case "DIRECT_MESSAGE": {
      if (notification.conversationId) {
        return `/messages?conversation=${notification.conversationId}`;
      }
      return "/messages";
    }
    default:
      return "/";
  }
}

export function getNotificationDeepLinkUrl(notification: NotificationPayload): string {
  return `${getBaseUrl()}${getNotificationDeepLinkPath(notification)}`;
}

export function isActiveNotificationContext(
  notification: NotificationPayload,
  activeLeadCommentDialogId: string | null,
  activeConversationId: string | null,
): boolean {
  if (
    (notification.type === "LEAD_MENTION" || notification.type === "LEAD_COMMENT") &&
    notification.leadId &&
    activeLeadCommentDialogId === notification.leadId
  ) {
    return true;
  }

  if (
    notification.type === "DIRECT_MESSAGE" &&
    notification.conversationId &&
    activeConversationId === notification.conversationId
  ) {
    return true;
  }

  return false;
}
