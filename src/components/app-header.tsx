"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { NotificationPermissionBanner } from "@/components/notifications/notification-permission-banner";
import { usePageTitle } from "@/components/page-title";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { TargetProgressBadge } from "@/components/targets/target-progress-badge";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  const { title, leadCount } = usePageTitle();

  return (
    <>
      <NotificationPermissionBanner />
      <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
        <SidebarTrigger className="-ml-1" />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p className="truncate text-sm font-semibold">{title}</p>
          {leadCount !== undefined ? (
            <Badge variant="secondary" className="shrink-0 font-normal">
              {leadCount} {leadCount === 1 ? "lead" : "leads"}
            </Badge>
          ) : null}
          <TargetProgressBadge />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationDropdown />
          <ScrollToTopButton />
          <ModeToggle />
        </div>
      </header>
    </>
  );
}
