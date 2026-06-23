import { createHmac, timingSafeEqual } from "node:crypto";

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }

  return secret;
}

export function signPayload<T extends object>(payload: T): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getSigningSecret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifySignedPayload<T extends { exp: number }>(token: string): T | null {
  const [data, signature] = token.split(".");

  if (!data || !signature) {
    return null;
  }

  const expected = createHmac("sha256", getSigningSecret()).update(data).digest("base64url");

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as T;

    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
