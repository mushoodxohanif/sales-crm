import { db } from "@/lib/db";
import { verifySecret } from "@/lib/integrations/hash-secret";
import { isLosonoRedirectUri, LOSONO_OAUTH_CLIENT_ID } from "@/lib/integrations/losono";
import { OAuthError } from "@/lib/integrations/oauth/errors";

export type IntegrationClientRecord = {
  clientId: string;
  clientSecret: string;
  redirectUris: unknown;
  isPublic: boolean;
};

export async function getIntegrationClient(clientId: string) {
  return db.integrationClient.findUnique({
    where: { clientId },
  });
}

export function getRegisteredRedirectUris(client: { redirectUris: unknown }): string[] {
  if (!Array.isArray(client.redirectUris)) {
    return [];
  }

  return client.redirectUris.filter((uri): uri is string => typeof uri === "string");
}

export function isRedirectUriAllowed(
  client: IntegrationClientRecord,
  redirectUri: string,
): boolean {
  if (getRegisteredRedirectUris(client).includes(redirectUri)) {
    return true;
  }

  if (client.isPublic && client.clientId === LOSONO_OAUTH_CLIENT_ID) {
    return isLosonoRedirectUri(redirectUri);
  }

  return false;
}

export async function authenticateIntegrationClient(
  clientId: string,
  clientSecret?: string | null,
) {
  const client = await getIntegrationClient(clientId);

  if (!client) {
    throw new OAuthError("invalid_client", "Invalid client credentials", 401);
  }

  if (client.isPublic) {
    return client;
  }

  if (!clientSecret || !verifySecret(clientSecret, client.clientSecret)) {
    throw new OAuthError("invalid_client", "Invalid client credentials", 401);
  }

  return client;
}

export function resolveClientCredentialsFromRequest(
  request: Request,
  params: URLSearchParams,
): {
  clientId: string;
  clientSecret: string | null;
} {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex === -1) {
      throw new OAuthError("invalid_client", "Invalid authorization header", 401);
    }

    return {
      clientId: decodeURIComponent(decoded.slice(0, separatorIndex)),
      clientSecret: decodeURIComponent(decoded.slice(separatorIndex + 1)),
    };
  }

  const clientId = params.get("client_id");

  if (!clientId) {
    throw new OAuthError("invalid_client", "client_id is required", 401);
  }

  return {
    clientId,
    clientSecret: params.get("client_secret"),
  };
}
