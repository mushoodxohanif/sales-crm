"use client";

import {
  FileSpreadsheetIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  ShapesIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";
import type { UserRole } from "@/generated/prisma/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon, match: "exact" as const },
  { href: "/campaign-types", label: "Campaign types", icon: ShapesIcon, match: "prefix" as const },
  { href: "/campaigns", label: "Campaigns", icon: MegaphoneIcon, match: "prefix" as const },
  { href: "/targets", label: "Targets", icon: TargetIcon, match: "exact" as const },
  { href: "/import", label: "Import", icon: FileSpreadsheetIcon, match: "prefix" as const },
  { href: "/messages", label: "Messages", icon: MessageSquareIcon, match: "exact" as const },
  { href: "/team", label: "Team", icon: UsersIcon, match: "exact" as const },
];

function isActive(pathname: string, href: string, match: "exact" | "prefix"): boolean {
  if (match === "exact") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

interface AppSidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: UserRole | null;
  } | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex h-12 items-start justify-center border-b border-sidebar-border">
        <MegaphoneIcon className="size-4" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href, item.match);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {user ? (
        <SidebarFooter className="border-t border-sidebar-border">
          <UserMenu
            variant="sidebar"
            name={user.name}
            email={user.email}
            image={user.image}
            role={user.role}
          />
        </SidebarFooter>
      ) : null}

      <SidebarRail />
    </Sidebar>
  );
}
