import { auth } from "@/auth";
import { SignInButton } from "@/components/landing/sign-in-button";
import { OAuthConsentForm } from "@/components/oauth/consent-form";
import { ExternalRedirect } from "@/components/oauth/external-redirect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type AuthorizeParams,
  buildAuthorizeCallbackUrl,
  parseAuthorizeParams,
} from "@/lib/integrations/oauth/authorize-params";
import { OAuthError } from "@/lib/integrations/oauth/errors";

interface AuthorizePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toSearchParams(params: Record<string, string | string[] | undefined>): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      searchParams.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      searchParams.set(key, value[0]);
    }
  }

  return searchParams;
}

export default async function AuthorizePage({ searchParams }: AuthorizePageProps) {
  const resolvedParams = await searchParams;
  const search = toSearchParams(resolvedParams);

  let authorizeParams: AuthorizeParams;

  try {
    authorizeParams = await parseAuthorizeParams(search);
  } catch (error) {
    const redirectUri = search.get("redirect_uri");
    const state = search.get("state");

    if (error instanceof OAuthError && redirectUri) {
      const url = new URL(redirectUri);
      url.searchParams.set("error", error.code);
      if (state) {
        url.searchParams.set("state", state);
      }

      return (
        <main className="flex min-h-screen items-center justify-center p-4">
          <ExternalRedirect url={url.toString()} />
        </main>
      );
    }

    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authorization failed</CardTitle>
            <CardDescription>
              {error instanceof OAuthError ? error.message : "Invalid authorization request."}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const session = await auth();
  const callbackUrl = buildAuthorizeCallbackUrl(authorizeParams);

  if (!session?.user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in to continue</CardTitle>
            <CardDescription>
              Sign in with your Google Workspace account to authorize {authorizeParams.clientName}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInButton callbackUrl={callbackUrl} className="w-full" size="lg">
              Continue with Google
            </SignInButton>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <OAuthConsentForm
        clientName={authorizeParams.clientName}
        scopes={authorizeParams.scopes}
        responseType={authorizeParams.responseType}
        clientId={authorizeParams.clientId}
        redirectUri={authorizeParams.redirectUri}
        state={authorizeParams.state}
        codeChallenge={authorizeParams.codeChallenge}
        codeChallengeMethod={authorizeParams.codeChallengeMethod}
      />
    </main>
  );
}
