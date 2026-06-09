import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { PageTitleProvider } from "@/components/page-title";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <PageTitleProvider>
          <AppSidebar
            user={
              session?.user
                ? {
                    name: session.user.name,
                    email: session.user.email,
                    image: session.user.image,
                  }
                : null
            }
          />
          <SidebarInset className="flex h-svh flex-col overflow-hidden">
            <AppHeader />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
          </SidebarInset>
        </PageTitleProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}
