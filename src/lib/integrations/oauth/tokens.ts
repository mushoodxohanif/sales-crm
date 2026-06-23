import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hashSecret } from "@/lib/integrations/hash-secret";
import { OAuthError } from "@/lib/integrations/oauth/errors";
import { verifyPkceChallenge } from "@/lib/integrations/oauth/pkce";
import type { IntegrationScope } from "@/lib/integrations/oauth/scopes";
import { formatScopeString } from "@/lib/integrations/oauth/scopes";

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createIntegrationGrant(input: {
  userId: string;
  clientId: string;
  scopes: IntegrationScope[];
}) {
  const existing = await db.integrationGrant.findFirst({
    where: {
      userId: input.userId,
      clientId: input.clientId,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return db.integrationGrant.update({
      where: { id: existing.id },
      data: {
        scopes: input.scopes,
        revokedAt: null,
      },
    });
  }

  return db.integrationGrant.create({
    data: {
      userId: input.userId,
      clientId: input.clientId,
      scopes: input.scopes,
    },
  });
}

export async function issueIntegrationTokens(grantId: string, scopes: IntegrationScope[]) {
  const accessToken = generateToken();
  const refreshToken = generateToken();
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);

  await db.integrationToken.create({
    data: {
      grantId,
      accessTokenHash: hashSecret(accessToken),
      refreshTokenHash: hashSecret(refreshToken),
      expiresAt,
    },
  });

  return {
    access_token: accessToken,
    token_type: "Bearer" as const,
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    refresh_token: refreshToken,
    scope: formatScopeString(scopes),
  };
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  payload: {
    userId: string;
    clientId: string;
    scopes: IntegrationScope[];
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod: string;
  };
}) {
  if (input.payload.clientId !== input.clientId) {
    throw new OAuthError("invalid_grant", "Authorization code was not issued to this client");
  }

  if (input.payload.redirectUri !== input.redirectUri) {
    throw new OAuthError("invalid_grant", "Redirect URI does not match");
  }

  if (
    !verifyPkceChallenge(
      input.codeVerifier,
      input.payload.codeChallenge,
      input.payload.codeChallengeMethod,
    )
  ) {
    throw new OAuthError("invalid_grant", "PKCE verification failed");
  }

  const grant = await createIntegrationGrant({
    userId: input.payload.userId,
    clientId: input.clientId,
    scopes: input.payload.scopes,
  });

  return issueIntegrationTokens(grant.id, input.payload.scopes);
}

export async function refreshIntegrationTokens(refreshToken: string, clientId: string) {
  const refreshTokenHash = hashSecret(refreshToken);

  const token = await db.integrationToken.findUnique({
    where: { refreshTokenHash },
    include: {
      grant: {
        include: {
          client: true,
        },
      },
    },
  });

  if (!token || token.grant.revokedAt || token.grant.clientId !== clientId) {
    throw new OAuthError("invalid_grant", "Invalid refresh token");
  }

  await db.integrationToken.delete({
    where: { id: token.id },
  });

  return issueIntegrationTokens(token.grantId, token.grant.scopes as IntegrationScope[]);
}

export async function revokeIntegrationToken(token: string, clientId: string) {
  const accessTokenHash = hashSecret(token);
  const refreshTokenHash = hashSecret(token);

  const tokenRecord = await db.integrationToken.findFirst({
    where: {
      OR: [{ accessTokenHash }, { refreshTokenHash }],
      grant: { clientId },
    },
    include: { grant: true },
  });

  if (!tokenRecord) {
    return;
  }

  await db.$transaction([
    db.integrationToken.deleteMany({
      where: { grantId: tokenRecord.grantId },
    }),
    db.integrationGrant.update({
      where: { id: tokenRecord.grantId },
      data: { revokedAt: new Date() },
    }),
  ]);
}
