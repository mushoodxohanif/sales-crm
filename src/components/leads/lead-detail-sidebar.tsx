"use client";

import { useEffect, useState } from "react";
import { LeadActivityPanel } from "@/components/leads/lead-activity-panel";
import { LeadVersionHistoryPanel } from "@/components/leads/lead-version-history-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RevertedLeadPayload } from "@/lib/actions/lead-versions";

interface LeadDetailSidebarProps {
  leadId: string;
  active: boolean;
  disabled?: boolean;
  focusCommentsOnOpen?: boolean;
  onReverted?: (lead: RevertedLeadPayload) => void;
}

export function LeadDetailSidebar({
  leadId,
  active,
  disabled = false,
  focusCommentsOnOpen = false,
  onReverted,
}: LeadDetailSidebarProps) {
  const [tab, setTab] = useState(focusCommentsOnOpen ? "activity" : "history");

  useEffect(() => {
    if (focusCommentsOnOpen) {
      setTab("activity");
    }
  }, [focusCommentsOnOpen]);

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden"
    >
      <div className="shrink-0 border-b px-4 py-3">
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="history"
        forceMount
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
      >
        <LeadVersionHistoryPanel
          leadId={leadId}
          active={active}
          disabled={disabled}
          onReverted={onReverted}
        />
      </TabsContent>

      <TabsContent value="activity" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
        <LeadActivityPanel
          leadId={leadId}
          active={active && tab === "activity"}
          disabled={disabled}
          autoFocusInput={focusCommentsOnOpen && tab === "activity"}
          showHeader={false}
        />
      </TabsContent>
    </Tabs>
  );
}
