import { db } from "@/lib/db";
import { ApiError } from "@/lib/integrations/api/errors";
import { checkRateLimit } from "@/lib/integrations/api/rate-limit";
import { hashSecret } from "@/lib/integrations/hash-secret";
import type { IntegrationScope } from "@/lib/integrations/oauth/scopes";

export type AuthenticatedIntegration = {
  grantId: string;
  userId: string;
  scopes: IntegrationScope[];
  tokenId: string;
};

function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function hasScope(scopes: IntegrationScope[], required: IntegrationScope): boolean {
  return scopes.includes(required);
}

export async function authenticateBearer(
  request: Request,
  requiredScope: IntegrationScope,
): Promise<AuthenticatedIntegration> {
  const token = extractBearerToken(request);

  if (!token) {
    throw new ApiError("unauthorized", "Missing or invalid Authorization header.", 401);
  }

  const accessTokenHash = hashSecret(token);

  const tokenRecord = await db.integrationToken.findUnique({
    where: { accessTokenHash },
    include: {
      grant: true,
    },
  });

  if (!tokenRecord) {
    throw new ApiError("unauthorized", "Invalid access token.", 401);
  }

  if (tokenRecord.grant.revokedAt) {
    throw new ApiError("unauthorized", "Access token has been revoked.", 401);
  }

  if (tokenRecord.expiresAt <= new Date()) {
    throw new ApiError("unauthorized", "Access token has expired.", 401);
  }

  const scopes = tokenRecord.grant.scopes as IntegrationScope[];

  if (!hasScope(scopes, requiredScope)) {
    throw new ApiError("forbidden", `Missing required scope: ${requiredScope}.`, 403);
  }

  const rateLimit = checkRateLimit(tokenRecord.id);

  if (!rateLimit.allowed) {
    throw new ApiError(
      "rate_limited",
      `Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`,
      429,
    );
  }

  return {
    grantId: tokenRecord.grantId,
    userId: tokenRecord.grant.userId,
    scopes,
    tokenId: tokenRecord.id,
  };
}
