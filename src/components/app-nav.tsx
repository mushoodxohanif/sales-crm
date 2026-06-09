"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", match: "exact" as const },
  { href: "/campaign-types", label: "Campaign types", match: "prefix" as const },
  { href: "/campaigns", label: "Campaigns", match: "prefix" as const },
  { href: "/import", label: "Import", match: "prefix" as const },
];

function isActive(pathname: string, href: string, match: "exact" | "prefix"): boolean {
  if (match === "exact") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {navItems.map((item) => {
        const active = isActive(pathname, item.href, item.match);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
