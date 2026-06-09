"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { usePageTitle } from "@/components/page-title";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  const { title } = usePageTitle();

  return (
    <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ScrollToTopButton />
        <ModeToggle />
      </div>
    </header>
  );
}
