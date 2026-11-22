import { timingSafeEqual } from "node:crypto";

/**
 * true khi header Authorization đúng "Bearer <secret>" (so sánh thời gian cố định).
 * Secret rỗng hoặc ngắn hơn 16 ký tự thì luôn false.
 */
export function isValidCronAuth(
  authHeader: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (!secret || secret.trim().length < 16) return false;
  if (!authHeader) return false;

  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) return false;

  const token = authHeader.slice(prefix.length).trim();
  const tokenBuf = Buffer.from(token, "utf8");
  const secretBuf = Buffer.from(secret.trim(), "utf8");

  if (tokenBuf.length !== secretBuf.length) return false;

  return timingSafeEqual(tokenBuf, secretBuf);
}
