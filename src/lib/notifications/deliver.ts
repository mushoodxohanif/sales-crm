import { db } from "@/lib/db";
import { toNotificationPayload } from "@/lib/notifications/serialize";
import type { DeliverNotificationInput, NotificationPayload } from "@/lib/notifications/types";
import { pusherChannels } from "@/lib/realtime/channels";
import { triggerPusherEvent } from "@/lib/realtime/pusher-server";

const actorSelect = { id: true, name: true, image: true } as const;

async function resolveCampaignId(leadId: string | undefined): Promise<string | null> {
  if (!leadId) {
    return null;
  }

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { campaignId: true },
  });

  return lead?.campaignId ?? null;
}

export async function deliverNotification(
  input: DeliverNotificationInput,
): Promise<NotificationPayload> {
  const notification = await db.notification.create({
    data: {
      userId: input.recipientId,
      type: input.type,
      actorId: input.actorId,
      preview: input.preview,
      leadId: input.leadId,
      commentId: input.commentId,
      conversationId: input.conversationId,
      messageId: input.messageId,
    },
    include: {
      actor: { select: actorSelect },
    },
  });

  const campaignId = await resolveCampaignId(input.leadId);
  const payload = toNotificationPayload(notification, campaignId);

  await triggerPusherEvent(pusherChannels.user(input.recipientId), "notification:created", payload);

  return payload;
}
