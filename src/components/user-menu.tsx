"use client";

import { ChevronsUpDownIcon, LogOutIcon, TargetIcon } from "lucide-react";
import Link from "next/link";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { UserRoleBadge } from "@/components/team/user-role-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { UserRole } from "@/generated/prisma/client";
import { signOutAction } from "@/lib/actions/auth";

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: UserRole | null;
  variant?: "header" | "sidebar";
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }

    return (parts[0]?.[0] ?? "?").toUpperCase();
  }

  return (email?.[0] ?? "?").toUpperCase();
}

function UserAvatar({
  name,
  email,
  image,
  size = "sm",
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: "sm" | "default";
}) {
  return (
    <Avatar size={size}>
      {image ? <AvatarImage src={image} alt={name ?? email ?? "User"} /> : null}
      <AvatarFallback>{getInitials(name, email)}</AvatarFallback>
    </Avatar>
  );
}

export function UserMenu({ name, email, image, role, variant = "header" }: UserMenuProps) {
  const menuContent = (
    <>
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col gap-1.5">
          {name ? <p className="text-sm font-medium leading-none">{name}</p> : null}
          {email ? <p className="text-muted-foreground text-xs leading-none">{email}</p> : null}
          {role ? <UserRoleBadge role={role} /> : null}
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <NotificationSettings />
      <DropdownMenuItem asChild>
        <Link href="/settings/icp" className="flex items-center gap-1.5">
          <TargetIcon className="size-4" />
          ICP settings
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" asChild>
        <form action={signOutAction} className="w-full">
          <button type="submit" className="flex w-full items-center gap-1.5 text-left text-sm">
            <LogOutIcon className="size-4" />
            Sign out
          </button>
        </form>
      </DropdownMenuItem>
    </>
  );

  if (variant === "sidebar") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <UserAvatar name={name} email={email} image={image} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name ?? "Account"}</span>
                  {email ? (
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  ) : null}
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side="top"
              align="end"
              sideOffset={4}
            >
              {menuContent}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-9 rounded-full p-0">
          <UserAvatar name={name} email={email} image={image} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {menuContent}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
