import type { NotificationType } from "@/generated/prisma/client";
import type { NotificationActor, NotificationPayload } from "@/lib/notifications/types";

type NotificationRecord = {
  id: string;
  type: NotificationType;
  preview: string;
  leadId: string | null;
  commentId: string | null;
  conversationId: string | null;
  messageId: string | null;
  readAt: Date | null;
  createdAt: Date;
  actor: NotificationActor;
};

export function toNotificationPayload(
  notification: NotificationRecord,
  campaignId: string | null = null,
): NotificationPayload {
  return {
    id: notification.id,
    type: notification.type,
    preview: notification.preview,
    leadId: notification.leadId,
    commentId: notification.commentId,
    conversationId: notification.conversationId,
    messageId: notification.messageId,
    campaignId,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    actor: notification.actor,
  };
}
