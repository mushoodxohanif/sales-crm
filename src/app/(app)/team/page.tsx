import Link from "next/link";
import { auth } from "@/auth";
import { UserRoleBadge } from "@/components/team/user-role-badge";
import { UserRoleSelect } from "@/components/team/user-role-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listWorkspaceUsers } from "@/lib/data/users";
import { cn } from "@/lib/utils";

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }

    return (parts[0]?.[0] ?? "?").toUpperCase();
  }

  return (email[0] ?? "?").toUpperCase();
}

export default async function TeamPage() {
  const session = await auth();
  const currentUserId = session?.user?.id;
  const users = await listWorkspaceUsers();

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Team</h1>
        <p className="text-muted-foreground text-sm">
          Everyone in your workspace. Roles are labels only and do not change access.
        </p>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <h2 className="text-lg font-medium">No team members yet</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Team members appear here after they sign in with your Google Workspace account.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const displayName = user.name ?? user.email;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          {user.image ? <AvatarImage src={user.image} alt={displayName} /> : null}
                          <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-medium">{displayName}</p>
                          {user.name ? (
                            <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <UserRoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {currentUserId && user.id !== currentUserId ? (
                          <Link
                            href={`/messages?user=${user.id}`}
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                          >
                            Message
                          </Link>
                        ) : null}
                        <UserRoleSelect userId={user.id} role={user.role} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
