const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  tokenId: string,
): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(tokenId);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(tokenId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}
