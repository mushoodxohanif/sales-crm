import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { PageTitleProvider } from "@/components/page-title";
import { DailyTargetProgressProvider } from "@/components/targets/daily-target-progress-provider";
import { TargetFloatingPanel } from "@/components/targets/target-floating-panel";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const shellContent = (
    <>
      <AppSidebar
        user={
          session?.user
            ? {
                name: session.user.name,
                email: session.user.email,
                image: session.user.image,
                role: session.user.role,
              }
            : null
        }
      />
      <SidebarInset className="flex h-svh flex-col overflow-hidden">
        <AppHeader />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      </SidebarInset>
    </>
  );

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <PageTitleProvider>
          {session?.user?.id ? (
            <DailyTargetProgressProvider>
              <NotificationProvider userId={session.user.id}>
                {shellContent}
                <TargetFloatingPanel />
              </NotificationProvider>
            </DailyTargetProgressProvider>
          ) : (
            shellContent
          )}
        </PageTitleProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}
