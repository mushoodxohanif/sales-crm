import { verifyAuthorizationCode } from "@/lib/integrations/oauth/authorization-code";
import {
  authenticateIntegrationClient,
  isRedirectUriAllowed,
  resolveClientCredentialsFromRequest,
} from "@/lib/integrations/oauth/client";
import { OAuthError, oauthErrorResponse } from "@/lib/integrations/oauth/errors";
import {
  exchangeAuthorizationCode,
  refreshIntegrationTokens,
} from "@/lib/integrations/oauth/tokens";

async function readFormBody(request: Request): Promise<URLSearchParams> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/x-www-form-urlencoded")) {
    throw new OAuthError(
      "invalid_request",
      "Content-Type must be application/x-www-form-urlencoded",
    );
  }

  const body = await request.text();
  return new URLSearchParams(body);
}

export async function POST(request: Request) {
  try {
    const params = await readFormBody(request);
    const grantType = params.get("grant_type");

    if (!grantType) {
      throw new OAuthError("invalid_request", "grant_type is required");
    }

    const { clientId, clientSecret } = resolveClientCredentialsFromRequest(request, params);
    const client = await authenticateIntegrationClient(clientId, clientSecret);

    if (grantType === "authorization_code") {
      const code = params.get("code");
      const redirectUri = params.get("redirect_uri");
      const codeVerifier = params.get("code_verifier");

      if (!code || !redirectUri || !codeVerifier) {
        throw new OAuthError(
          "invalid_request",
          "code, redirect_uri, and code_verifier are required",
        );
      }

      if (!isRedirectUriAllowed(client, redirectUri)) {
        throw new OAuthError("invalid_grant", "redirect_uri is not registered for this client");
      }

      const payload = verifyAuthorizationCode(code);

      if (!payload) {
        throw new OAuthError("invalid_grant", "Authorization code is invalid or expired");
      }

      const tokenResponse = await exchangeAuthorizationCode({
        code,
        clientId,
        redirectUri,
        codeVerifier,
        payload,
      });

      return Response.json(tokenResponse);
    }

    if (grantType === "refresh_token") {
      const refreshToken = params.get("refresh_token");

      if (!refreshToken) {
        throw new OAuthError("invalid_request", "refresh_token is required");
      }

      const tokenResponse = await refreshIntegrationTokens(refreshToken, clientId);
      return Response.json(tokenResponse);
    }

    throw new OAuthError("unsupported_grant_type", `Unsupported grant_type: ${grantType}`);
  } catch (error) {
    if (error instanceof OAuthError) {
      return oauthErrorResponse(error);
    }

    console.error("OAuth token error:", error);
    return oauthErrorResponse(new OAuthError("invalid_request", "Token request failed", 500));
  }
}
