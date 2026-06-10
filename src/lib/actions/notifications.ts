"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import { getNotificationsForUser, getUnreadNotificationCount } from "@/lib/data/notifications";
import { db } from "@/lib/db";
import {
  ensureUserNotificationPreferences,
  getUserNotificationPreferences,
} from "@/lib/notifications/preferences";
import type {
  NotificationPayload,
  UserNotificationPreferencesPayload,
} from "@/lib/notifications/types";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

const updatePreferencesSchema = z.object({
  browserEnabled: z.boolean().optional(),
});

const notificationIdSchema = z.object({
  id: z.string().min(1),
});

export async function getNotifications(): Promise<ActionResult<NotificationPayload[]>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const notifications = await getNotificationsForUser(userId);
  return actionSuccess(notifications);
}

export async function getUnreadCount(): Promise<ActionResult<number>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const count = await getUnreadNotificationCount(userId);
  return actionSuccess(count);
}

export async function getNotificationPreferences(): Promise<
  ActionResult<UserNotificationPreferencesPayload>
> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  await ensureUserNotificationPreferences(userId);
  const prefs = await getUserNotificationPreferences(userId);
  return actionSuccess(prefs);
}

export async function updateNotificationPreferences(
  input: unknown,
): Promise<ActionResult<UserNotificationPreferencesPayload>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = updatePreferencesSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  await ensureUserNotificationPreferences(userId);

  const prefs = await db.userNotificationPreferences.update({
    where: { userId },
    data: {
      ...(parsed.data.browserEnabled !== undefined
        ? { browserEnabled: parsed.data.browserEnabled }
        : {}),
    },
    select: { browserEnabled: true },
  });

  return actionSuccess(prefs);
}

export async function markNotificationRead(input: unknown): Promise<ActionResult<boolean>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  const parsed = notificationIdSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await db.notification.updateMany({
    where: { id: parsed.data.id, userId, readAt: null },
    data: { readAt: new Date() },
  });

  return actionSuccess(result.count > 0);
}

export async function markAllNotificationsRead(): Promise<ActionResult<void>> {
  const userId = await requireUserId();
  if (!userId) {
    return actionError("You must be signed in to perform this action.");
  }

  await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return actionSuccess(undefined);
}
