"use client";

import { useEffect, useState } from "react";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { updateNotificationPreferences } from "@/lib/actions/notifications";

export function NotificationSettings() {
  const { preferences, updatePreferences } = useNotifications();
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setBrowserPermission("unsupported");
      return;
    }

    setBrowserPermission(Notification.permission);
  }, []);

  async function handleBrowserToggle(enabled: boolean) {
    if (enabled && browserPermission === "default" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);

      if (permission !== "granted") {
        setSaving(true);

        try {
          const result = await updateNotificationPreferences({ browserEnabled: false });

          if (result.success) {
            updatePreferences(result.data);
          }
        } finally {
          setSaving(false);
        }

        return;
      }
    }

    setSaving(true);

    try {
      const result = await updateNotificationPreferences({ browserEnabled: enabled });

      if (result.success) {
        updatePreferences(result.data);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 px-2 py-1.5">
      <p className="text-xs font-medium text-muted-foreground">Notification settings</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id="browser-notifications"
            checked={preferences.browserEnabled}
            disabled={
              saving ||
              browserPermission === "unsupported" ||
              (browserPermission === "denied" && !preferences.browserEnabled)
            }
            onCheckedChange={(checked) => void handleBrowserToggle(checked === true)}
          />
          <Label htmlFor="browser-notifications" className="text-sm font-normal">
            Browser notifications
          </Label>
        </div>
        {browserPermission === "denied" ? (
          <p className="pl-6 text-muted-foreground text-xs">
            Browser notifications are blocked. Re-enable them in your browser settings.
          </p>
        ) : null}
      </div>
    </div>
  );
}
