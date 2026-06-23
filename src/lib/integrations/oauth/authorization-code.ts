import type { IntegrationScope } from "@/lib/integrations/oauth/scopes";
import { signPayload, verifySignedPayload } from "@/lib/integrations/oauth/signed-payload";

const AUTHORIZATION_CODE_TTL_MS = 10 * 60 * 1000;

export interface AuthorizationCodePayload {
  userId: string;
  clientId: string;
  scopes: IntegrationScope[];
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  exp: number;
}

export function issueAuthorizationCode(payload: Omit<AuthorizationCodePayload, "exp">): string {
  return signPayload({
    ...payload,
    exp: Date.now() + AUTHORIZATION_CODE_TTL_MS,
  });
}

export function verifyAuthorizationCode(code: string): AuthorizationCodePayload | null {
  return verifySignedPayload<AuthorizationCodePayload>(code);
}
