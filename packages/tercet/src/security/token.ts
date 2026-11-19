import { createHash, timingSafeEqual } from "node:crypto";

/** Shortest accepted publishing token. 32 random characters put guessing out of reach. */
export const MIN_TOKEN_LENGTH = 32;

/**
 * Constant-time comparison. Both sides are hashed first so the comparison
 * time reveals neither the token's content nor its length.
 */
export function tokensMatch(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function bearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer[ \t]+(\S+)[ \t]*$/i);
  return match ? match[1] : null;
}

/**
 * The configured publishing token, or `null` when publishing is off. A token
 * shorter than the minimum disables publishing rather than running weakly.
 */
export function configuredToken(env: Readonly<Record<string, string | undefined>>): string | null {
  const token = env.TERCET_WRITE_TOKEN?.trim();
  if (!token) return null;
  if (token.length < MIN_TOKEN_LENGTH) {
    console.warn(`[poems] TERCET_WRITE_TOKEN is shorter than ${MIN_TOKEN_LENGTH} characters; publishing is disabled.`);
    return null;
  }
  return token;
}
