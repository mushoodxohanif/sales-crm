import type { NotificationType } from "@/generated/prisma/client";

export type NotificationActor = {
  id: string;
  name: string | null;
  image: string | null;
};

export type NotificationPayload = {
  id: string;
  type: NotificationType;
  preview: string;
  leadId: string | null;
  commentId: string | null;
  conversationId: string | null;
  messageId: string | null;
  campaignId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: NotificationActor;
};

export type DeliverNotificationInput = {
  recipientId: string;
  type: NotificationType;
  actorId: string;
  preview: string;
  leadId?: string;
  commentId?: string;
  conversationId?: string;
  messageId?: string;
};

export type UserNotificationPreferencesPayload = {
  browserEnabled: boolean;
};
