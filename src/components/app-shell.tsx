import { auth } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
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
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="ml-auto flex items-center gap-2">
              <ModeToggle />
            </div>
          </header>
          <div className="flex min-h-[calc(100svh-3.5rem)] flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
