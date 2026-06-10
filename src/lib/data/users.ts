import { db } from "@/lib/db";

export async function listWorkspaceUsers() {
  return db.user.findMany({
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
  });
}
