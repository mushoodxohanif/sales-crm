import { getIntegrationClient, isRedirectUriAllowed } from "@/lib/integrations/oauth/client";
import { OAuthError } from "@/lib/integrations/oauth/errors";
import {
  type IntegrationScope,
  parseScopeString,
  validateRequestedScopes,
} from "@/lib/integrations/oauth/scopes";

export interface AuthorizeParams {
  responseType: string;
  clientId: string;
  redirectUri: string;
  state: string | null;
  scopes: IntegrationScope[];
  codeChallenge: string;
  codeChallengeMethod: string;
  clientName: string;
}

export async function parseAuthorizeParams(
  searchParams: URLSearchParams,
): Promise<AuthorizeParams> {
  const responseType = searchParams.get("response_type");
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method") ?? "S256";

  if (responseType !== "code") {
    throw new OAuthError("unsupported_grant_type", "Only response_type=code is supported");
  }

  if (!clientId) {
    throw new OAuthError("invalid_request", "client_id is required");
  }

  if (!redirectUri) {
    throw new OAuthError("invalid_request", "redirect_uri is required");
  }

  if (!codeChallenge) {
    throw new OAuthError("invalid_request", "code_challenge is required");
  }

  if (codeChallengeMethod !== "S256") {
    throw new OAuthError("invalid_request", "Only S256 code challenge method is supported");
  }

  const client = await getIntegrationClient(clientId);

  if (!client) {
    throw new OAuthError("invalid_client", "Unknown client_id", 401);
  }

  if (!isRedirectUriAllowed(client, redirectUri)) {
    throw new OAuthError("invalid_request", "redirect_uri is not registered for this client");
  }

  const scopes = validateRequestedScopes(parseScopeString(searchParams.get("scope")));

  if (!scopes) {
    throw new OAuthError("invalid_scope", "One or more requested scopes are invalid");
  }

  return {
    responseType,
    clientId,
    redirectUri,
    state,
    scopes,
    codeChallenge,
    codeChallengeMethod,
    clientName: client.name,
  };
}

export function buildAuthorizeCallbackUrl(params: AuthorizeParams): string {
  const search = new URLSearchParams();
  search.set("response_type", params.responseType);
  search.set("client_id", params.clientId);
  search.set("redirect_uri", params.redirectUri);
  search.set("scope", params.scopes.join(" "));
  search.set("code_challenge", params.codeChallenge);
  search.set("code_challenge_method", params.codeChallengeMethod);
  if (params.state) {
    search.set("state", params.state);
  }
  return `/oauth/authorize?${search.toString()}`;
}
