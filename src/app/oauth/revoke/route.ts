import {
  authenticateIntegrationClient,
  resolveClientCredentialsFromRequest,
} from "@/lib/integrations/oauth/client";
import { OAuthError, oauthErrorResponse } from "@/lib/integrations/oauth/errors";
import { revokeIntegrationToken } from "@/lib/integrations/oauth/tokens";

async function readRevokeBody(request: Request): Promise<URLSearchParams> {
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
    const params = await readRevokeBody(request);
    const token = params.get("token");

    if (!token) {
      throw new OAuthError("invalid_request", "token is required");
    }

    const { clientId, clientSecret } = resolveClientCredentialsFromRequest(request, params);
    await authenticateIntegrationClient(clientId, clientSecret);
    await revokeIntegrationToken(token, clientId);

    return new Response(null, { status: 200 });
  } catch (error) {
    if (error instanceof OAuthError) {
      return oauthErrorResponse(error);
    }

    console.error("OAuth revoke error:", error);
    return oauthErrorResponse(new OAuthError("invalid_request", "Revoke request failed", 500));
  }
}
