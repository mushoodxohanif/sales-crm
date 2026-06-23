"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { type ActionResult, actionError, actionSuccess } from "@/lib/actions/types";
import { listLosonoIntegrationGrants, revokeLosonoIntegrationGrant } from "@/lib/data/integrations";

async function requireAuthUserId(): Promise<string | ActionResult<never>> {
  const session = await auth();

  if (!session?.user?.id) {
    return actionError("You must be signed in to perform this action.");
  }

  return session.user.id;
}

export async function getLosonoIntegrations() {
  const userId = await requireAuthUserId();

  if (typeof userId !== "string") {
    return [];
  }

  return listLosonoIntegrationGrants();
}

export async function revokeLosonoConnection(
  grantId: string,
): Promise<ActionResult<{ revoked: true }>> {
  const userId = await requireAuthUserId();

  if (typeof userId !== "string") {
    return userId;
  }

  const grants = await listLosonoIntegrationGrants();
  const grant = grants.find((item) => item.id === grantId);

  if (!grant) {
    return actionError("Connection not found.");
  }

  await revokeLosonoIntegrationGrant(grantId);
  revalidatePath("/settings/integrations/losono");

  return actionSuccess({ revoked: true });
}
