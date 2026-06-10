"use client";

import { BellIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Button } from "@/components/ui/button";
import { updateNotificationPreferences } from "@/lib/actions/notifications";

const DISMISS_STORAGE_KEY = "browserNotificationsDismissedAt";

function wasDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(localStorage.getItem(DISMISS_STORAGE_KEY));
}

export function NotificationPermissionBanner() {
  const { preferences, updatePreferences } = useNotifications();
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setVisible(false);
      return;
    }

    if (!preferences.browserEnabled || wasDismissed()) {
      setVisible(false);
      return;
    }

    setVisible(Notification.permission === "default");
  }, [preferences.browserEnabled]);

  if (!visible) {
    return null;
  }

  async function handleEnable() {
    if (!("Notification" in window)) {
      return;
    }

    setRequesting(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        const result = await updateNotificationPreferences({ browserEnabled: true });

        if (result.success) {
          updatePreferences(result.data);
        }

        setVisible(false);
        return;
      }

      const result = await updateNotificationPreferences({ browserEnabled: false });

      if (result.success) {
        updatePreferences(result.data);
      }

      setVisible(false);
    } finally {
      setRequesting(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_STORAGE_KEY, new Date().toISOString());
    setVisible(false);
  }

  return (
    <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2 text-sm">
      <BellIcon className="size-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 text-muted-foreground">
        Enable browser notifications to get alerts for comments and messages
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" onClick={() => void handleEnable()} disabled={requesting}>
          Enable
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleDismiss} aria-label="Dismiss">
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
