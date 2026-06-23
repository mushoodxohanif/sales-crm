import { createHash, timingSafeEqual } from "node:crypto";

export function verifyPkceChallenge(
  codeVerifier: string,
  codeChallenge: string,
  codeChallengeMethod: string,
): boolean {
  if (codeChallengeMethod !== "S256") {
    return false;
  }

  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }

  const digest = createHash("sha256").update(codeVerifier).digest();
  const computed = digest
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(codeChallenge));
  } catch {
    return false;
  }
}
