import { parseScopeString, validateRequestedScopes } from "@/lib/integrations/oauth/scopes";

function readAuthorizeFields(formData: FormData) {
  const redirectUri = formData.get("redirect_uri")?.toString();
  const state = formData.get("state")?.toString() ?? null;
  const clientId = formData.get("client_id")?.toString();
  const codeChallenge = formData.get("code_challenge")?.toString();
  const scopes = validateRequestedScopes(parseScopeString(formData.get("scope")?.toString()));

  if (!redirectUri || !clientId || !codeChallenge || !scopes) {
    return null;
  }

  return { redirectUri, state };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const fields = readAuthorizeFields(formData);

  if (!fields) {
    return new Response("Invalid authorization request", { status: 400 });
  }

  const url = new URL(fields.redirectUri);
  url.searchParams.set("error", "access_denied");
  if (fields.state) {
    url.searchParams.set("state", fields.state);
  }

  return Response.redirect(url.toString(), 302);
}
