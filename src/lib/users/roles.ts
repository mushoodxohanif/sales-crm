import type { UserRole } from "@/generated/prisma/client";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  SALES_MANAGER: "Sales Manager",
  SALES_AGENT: "Sales Agent",
};

export const USER_ROLES = Object.keys(USER_ROLE_LABELS) as UserRole[];

export function getUserRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role];
}
