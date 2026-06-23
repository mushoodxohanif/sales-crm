import { createHash, scryptSync, timingSafeEqual } from "node:crypto";

function getPepper(): string {
  return process.env.AUTH_SECRET ?? "";
}

export function hashSecret(value: string): string {
  const salt = createHash("sha256").update(value).digest("hex").slice(0, 16);
  const hash = scryptSync(`${value}${getPepper()}`, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

export function verifySecret(value: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(":");

  if (!salt || !hashHex) {
    return false;
  }

  const hash = scryptSync(`${value}${getPepper()}`, salt, 64);

  try {
    return timingSafeEqual(hash, Buffer.from(hashHex, "hex"));
  } catch {
    return false;
  }
}
