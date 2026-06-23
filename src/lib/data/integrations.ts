import { db } from "@/lib/db";
import { LOSONO_OAUTH_CLIENT_ID } from "@/lib/integrations/losono";

export type LosonoIntegrationGrant = {
  id: string;
  userId: string;
  scopes: string[];
  revokedAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  activeTokenCount: number;
};

export async function listLosonoIntegrationGrants(): Promise<LosonoIntegrationGrant[]> {
  const grants = await db.integrationGrant.findMany({
    where: {
      clientId: LOSONO_OAUTH_CLIENT_ID,
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      tokens: {
        select: { id: true },
      },
    },
  });

  return grants.map((grant) => ({
    id: grant.id,
    userId: grant.userId,
    scopes: grant.scopes,
    revokedAt: grant.revokedAt,
    createdAt: grant.createdAt,
    user: grant.user,
    activeTokenCount: grant.tokens.length,
  }));
}

export async function revokeLosonoIntegrationGrant(grantId: string): Promise<void> {
  await db.$transaction([
    db.integrationToken.deleteMany({
      where: { grantId },
    }),
    db.integrationGrant.update({
      where: { id: grantId },
      data: { revokedAt: new Date() },
    }),
  ]);
}
