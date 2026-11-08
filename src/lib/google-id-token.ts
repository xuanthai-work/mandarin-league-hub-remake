export type GoogleIdentity = { sub: string; email: string };

const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

/**
 * Validates the JSON returned by Google's tokeninfo endpoint for an ID token.
 * Returns the identity, or null when the token is not for this app, expired, or unverified.
 */
export function checkGoogleTokenInfo(
  info: unknown,
  clientId: string,
  nowSec: number,
): GoogleIdentity | null {
  if (!info || typeof info !== "object" || !clientId) return null;
  const t = info as Record<string, unknown>;
  if (t["aud"] !== clientId) return null;
  if (typeof t["iss"] !== "string" || !ISSUERS.has(t["iss"])) return null;
  if (t["email_verified"] !== "true" && t["email_verified"] !== true) return null;
  const exp = Number(t["exp"]);
  if (!Number.isFinite(exp) || exp <= nowSec) return null;
  const sub = t["sub"];
  if (typeof sub !== "string" || !/^[0-9]{5,30}$/.test(sub)) return null;
  const email = t["email"];
  if (typeof email !== "string" || !email.includes("@")) return null;
  return { sub, email: email.trim().toLowerCase() };
}
