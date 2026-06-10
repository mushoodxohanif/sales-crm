import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/generated/prisma/client";
import { getUserRoleLabel } from "@/lib/users/roles";

export function UserRoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant={role === "SALES_MANAGER" ? "default" : "secondary"}>
      {getUserRoleLabel(role)}
    </Badge>
  );
}
