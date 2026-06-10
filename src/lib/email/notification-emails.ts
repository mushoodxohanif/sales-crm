import type { NotificationType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getEmailFrom, getResendClient } from "@/lib/email/resend";
import { getNotificationDeepLinkUrl } from "@/lib/notifications/deep-links";
import { getUserNotificationPreferences } from "@/lib/notifications/preferences";
import { toNotificationPayload } from "@/lib/notifications/serialize";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getEmailSubject(type: NotificationType, actorName: string): string {
  switch (type) {
    case "LEAD_MENTION":
      return `${actorName} mentioned you on a lead`;
    case "LEAD_COMMENT":
      return `${actorName} commented on a lead you're following`;
    case "DIRECT_MESSAGE":
      return `${actorName} sent you a message`;
    default:
      return "New notification";
  }
}

function buildEmailText(
  type: NotificationType,
  actorName: string,
  preview: string,
  link: string,
): string {
  const heading = getEmailSubject(type, actorName);

  return `${heading}\n\n${preview}\n\nView in Lead'em: ${link}`;
}

function buildEmailHtml(
  type: NotificationType,
  actorName: string,
  preview: string,
  link: string,
): string {
  const heading = escapeHtml(getEmailSubject(type, actorName));
  const safePreview = escapeHtml(preview);
  const safeLink = escapeHtml(link);

  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111;">
    <p style="font-size: 16px; font-weight: 600; margin: 0 0 12px;">${heading}</p>
    <p style="margin: 0 0 16px; color: #444;">${safePreview}</p>
    <p style="margin: 0;">
      <a href="${safeLink}" style="color: #2563eb; text-decoration: none;">View in Lead'em</a>
    </p>
  </body>
</html>`;
}

export async function sendNotificationEmail(notificationId: string): Promise<void> {
  const resend = getResendClient();
  const from = getEmailFrom();

  if (!resend || !from) {
    console.warn("[email] Resend not configured; skipping notification email", notificationId);
    return;
  }

  const notification = await db.notification.findUnique({
    where: { id: notificationId },
    include: {
      actor: { select: { id: true, name: true, image: true } },
      user: { select: { email: true } },
    },
  });

  if (!notification?.user.email) {
    return;
  }

  const prefs = await getUserNotificationPreferences(notification.userId);

  if (!prefs.emailEnabled) {
    return;
  }

  let campaignId: string | null = null;

  if (notification.leadId) {
    const lead = await db.lead.findUnique({
      where: { id: notification.leadId },
      select: { campaignId: true },
    });
    campaignId = lead?.campaignId ?? null;
  }

  const payload = toNotificationPayload(notification, campaignId);
  const actorName = notification.actor.name ?? "Someone";
  const link = getNotificationDeepLinkUrl(payload);

  const subject = getEmailSubject(notification.type, actorName);

  try {
    const result = await resend.emails.send({
      from,
      to: notification.user.email,
      subject,
      text: buildEmailText(notification.type, actorName, notification.preview, link),
      html: buildEmailHtml(notification.type, actorName, notification.preview, link),
    });

    if (result.error) {
      console.error(
        "[email] Failed to send notification email:",
        notificationId,
        result.error.message,
      );
      return;
    }

    await db.notification.update({
      where: { id: notificationId },
      data: { emailSentAt: new Date() },
    });
  } catch (error) {
    console.error("[email] Failed to send notification email:", notificationId, error);
  }
}
