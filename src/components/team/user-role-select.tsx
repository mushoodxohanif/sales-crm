"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/generated/prisma/client";
import { updateUserRole } from "@/lib/actions/users";
import { getUserRoleLabel, USER_ROLES } from "@/lib/users/roles";

interface UserRoleSelectProps {
  userId: string;
  role: UserRole;
}

export function UserRoleSelect({ userId, role }: UserRoleSelectProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(newRole: string) {
    if (newRole === role) {
      return;
    }

    setPending(true);

    try {
      const result = await updateUserRole({ userId, role: newRole as UserRole });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Role updated");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Select value={role} onValueChange={(value) => void handleChange(value)} disabled={pending}>
      <SelectTrigger size="sm" className="w-42">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {USER_ROLES.map((roleOption) => (
          <SelectItem key={roleOption} value={roleOption}>
            {getUserRoleLabel(roleOption)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
