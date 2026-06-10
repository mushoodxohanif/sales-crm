"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { usePusherChannel } from "@/hooks/use-pusher-channel";
import {
  getNotificationPreferences,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import {
  shouldShowBrowserNotification,
  showBrowserNotification,
} from "@/lib/notifications/browser-notifications";
import {
  getNotificationDeepLinkPath,
  isActiveNotificationContext,
} from "@/lib/notifications/deep-links";
import { getNotificationTypeLabel } from "@/lib/notifications/labels";
import type {
  NotificationPayload,
  UserNotificationPreferencesPayload,
} from "@/lib/notifications/types";
import { pusherChannels } from "@/lib/realtime/channels";

type NotificationContextValue = {
  notifications: NotificationPayload[];
  unreadCount: number;
  preferences: UserNotificationPreferencesPayload;
  setActiveLeadCommentDialogId: (leadId: string | null) => void;
  setActiveConversationId: (conversationId: string | null) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  updatePreferences: (prefs: UserNotificationPreferencesPayload) => void;
  handleNotificationClick: (notification: NotificationPayload) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }

  return context;
}

export function NotificationProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<UserNotificationPreferencesPayload>({
    browserEnabled: true,
  });
  const [activeLeadCommentDialogId, setActiveLeadCommentDialogId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeContextRef = useRef({
    activeLeadCommentDialogId,
    activeConversationId,
    preferences,
  });

  activeContextRef.current = {
    activeLeadCommentDialogId,
    activeConversationId,
    preferences,
  };

  const refreshNotifications = useCallback(async () => {
    const [notificationsResult, unreadResult, prefsResult] = await Promise.all([
      getNotifications(),
      getUnreadCount(),
      getNotificationPreferences(),
    ]);

    if (notificationsResult.success) {
      setNotifications(notificationsResult.data);
    }

    if (unreadResult.success) {
      setUnreadCount(unreadResult.data);
    }

    if (prefsResult.success) {
      setPreferences(prefsResult.data);
    }
  }, []);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  const handleIncomingNotification = useCallback(
    (notification: NotificationPayload) => {
      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }
        return [notification, ...current];
      });

      if (!notification.readAt) {
        setUnreadCount((count) => count + 1);
      }

      const { activeLeadCommentDialogId, activeConversationId, preferences } =
        activeContextRef.current;
      const isActiveContext = isActiveNotificationContext(
        notification,
        activeLeadCommentDialogId,
        activeConversationId,
      );

      const browserOptions = {
        activeLeadCommentDialogId,
        activeConversationId,
        browserEnabled: preferences.browserEnabled,
      };

      if (shouldShowBrowserNotification(notification, browserOptions)) {
        showBrowserNotification(notification, browserOptions);
      } else if (!isActiveContext) {
        const actorName = notification.actor.name ?? "Someone";
        const label = getNotificationTypeLabel(notification.type, actorName);

        toast(label, {
          description: notification.preview,
          action: {
            label: "View",
            onClick: () => {
              router.push(getNotificationDeepLinkPath(notification));
            },
          },
        });
      }
    },
    [router],
  );

  usePusherChannel(
    pusherChannels.user(userId),
    {
      "notification:created": (data) => {
        handleIncomingNotification(data as NotificationPayload);
      },
    },
    Boolean(userId),
  );

  const markAsRead = useCallback(async (id: string) => {
    const result = await markNotificationRead({ id });

    if (!result.success) {
      return;
    }

    if (!result.data) {
      return;
    }

    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, readAt } : notification,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    const result = await markAllNotificationsRead();

    if (!result.success) {
      return;
    }

    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, readAt: readAt })),
    );
    setUnreadCount(0);
  }, []);

  const handleNotificationClick = useCallback(
    async (notification: NotificationPayload) => {
      if (!notification.readAt) {
        await markAsRead(notification.id);
      }

      router.push(getNotificationDeepLinkPath(notification));
    },
    [markAsRead, router],
  );

  const updatePreferences = useCallback((nextPreferences: UserNotificationPreferencesPayload) => {
    setPreferences(nextPreferences);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      preferences,
      setActiveLeadCommentDialogId,
      setActiveConversationId,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
      updatePreferences,
      handleNotificationClick,
    }),
    [
      notifications,
      unreadCount,
      preferences,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
      updatePreferences,
      handleNotificationClick,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
