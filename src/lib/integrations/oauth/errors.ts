export type OAuthErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "invalid_scope"
  | "unauthorized_client"
  | "unsupported_grant_type"
  | "access_denied";

export class OAuthError extends Error {
  constructor(
    readonly code: OAuthErrorCode,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

export function oauthErrorResponse(error: OAuthError): Response {
  return Response.json(
    { error: error.code, error_description: error.message },
    { status: error.status },
  );
}

export function redirectWithOAuthError(
  redirectUri: string,
  error: OAuthErrorCode,
  state?: string | null,
): Response {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (state) {
    url.searchParams.set("state", state);
  }
  return Response.redirect(url.toString(), 302);
}
