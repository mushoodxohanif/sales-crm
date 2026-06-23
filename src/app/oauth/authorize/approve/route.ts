import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { issueAuthorizationCode } from "@/lib/integrations/oauth/authorization-code";
import { parseScopeString, validateRequestedScopes } from "@/lib/integrations/oauth/scopes";

function readAuthorizeFields(formData: FormData) {
  const redirectUri = formData.get("redirect_uri")?.toString();
  const clientId = formData.get("client_id")?.toString();
  const state = formData.get("state")?.toString() ?? null;
  const codeChallenge = formData.get("code_challenge")?.toString();
  const codeChallengeMethod = formData.get("code_challenge_method")?.toString() ?? "S256";
  const scopes = validateRequestedScopes(parseScopeString(formData.get("scope")?.toString()));

  if (!redirectUri || !clientId || !codeChallenge || !scopes) {
    return null;
  }

  return {
    redirectUri,
    clientId,
    state,
    codeChallenge,
    codeChallengeMethod,
    scopes,
  };
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const formData = await request.formData();
  const fields = readAuthorizeFields(formData);

  if (!fields) {
    return new Response("Invalid authorization request", { status: 400 });
  }

  const code = issueAuthorizationCode({
    userId: session.user.id,
    clientId: fields.clientId,
    scopes: fields.scopes,
    redirectUri: fields.redirectUri,
    codeChallenge: fields.codeChallenge,
    codeChallengeMethod: fields.codeChallengeMethod,
  });

  const url = new URL(fields.redirectUri);
  url.searchParams.set("code", code);
  if (fields.state) {
    url.searchParams.set("state", fields.state);
  }

  return Response.redirect(url.toString(), 302);
}
