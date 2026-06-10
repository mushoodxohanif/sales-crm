import { db } from "@/lib/db";
import { toNotificationPayload } from "@/lib/notifications/serialize";
import type { NotificationPayload } from "@/lib/notifications/types";

const actorSelect = { id: true, name: true, image: true } as const;

const notificationInclude = {
  actor: { select: actorSelect },
} as const;

async function resolveCampaignIds(
  notifications: Array<{ leadId: string | null }>,
): Promise<Map<string, string>> {
  const leadIds = [
    ...new Set(notifications.map((n) => n.leadId).filter((id): id is string => id !== null)),
  ];

  if (leadIds.length === 0) {
    return new Map();
  }

  const leads = await db.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, campaignId: true },
  });

  return new Map(leads.map((lead) => [lead.id, lead.campaignId]));
}

export async function getNotificationsForUser(
  userId: string,
  limit = 50,
): Promise<NotificationPayload[]> {
  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: notificationInclude,
  });

  const campaignIdsByLead = await resolveCampaignIds(notifications);

  return notifications.map((notification) =>
    toNotificationPayload(
      notification,
      notification.leadId ? (campaignIdsByLead.get(notification.leadId) ?? null) : null,
    ),
  );
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return db.notification.count({
    where: { userId, readAt: null },
  });
}
