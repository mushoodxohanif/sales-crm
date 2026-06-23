"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INTEGRATION_SCOPES, type IntegrationScope } from "@/lib/integrations/oauth/scopes";

interface OAuthConsentFormProps {
  clientName: string;
  scopes: IntegrationScope[];
  responseType: string;
  clientId: string;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export function OAuthConsentForm({
  clientName,
  scopes,
  responseType,
  clientId,
  redirectUri,
  state,
  codeChallenge,
  codeChallengeMethod,
}: OAuthConsentFormProps) {
  const hiddenFields = {
    response_type: responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    ...(state ? { state } : {}),
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Authorize {clientName}</CardTitle>
        <CardDescription>
          {clientName} is requesting access to your Sales CRM account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">This app will be able to:</p>
          <ul className="space-y-2">
            {scopes.map((scope) => (
              <li key={scope} className="text-muted-foreground text-sm">
                {INTEGRATION_SCOPES[scope]}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-muted-foreground text-xs">
          You can revoke this connection at any time from your integration settings.
        </p>
      </CardContent>
      <CardFooter className="flex gap-2">
        <form action="/oauth/authorize/deny" method="post" className="flex-1">
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Button type="submit" variant="outline" className="w-full">
            Deny
          </Button>
        </form>
        <form action="/oauth/authorize/approve" method="post" className="flex-1">
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Button type="submit" className="w-full">
            Allow
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
