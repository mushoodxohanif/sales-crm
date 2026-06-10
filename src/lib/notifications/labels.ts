import type { NotificationType } from "@/generated/prisma/client";

export function getNotificationTypeLabel(type: NotificationType, actorName: string): string {
  switch (type) {
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
