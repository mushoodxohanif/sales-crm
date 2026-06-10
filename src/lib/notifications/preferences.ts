import { db } from "@/lib/db";
import type { UserNotificationPreferencesPayload } from "@/lib/notifications/types";

export async function getUserNotificationPreferences(
  userId: string,
): Promise<UserNotificationPreferencesPayload> {
  const prefs = await db.userNotificationPreferences.findUnique({
    where: { userId },
    select: { browserEnabled: true },
  });

  return {
    browserEnabled: prefs?.browserEnabled ?? true,
  };
}

export async function ensureUserNotificationPreferences(userId: string): Promise<void> {
  await db.userNotificationPreferences.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}
