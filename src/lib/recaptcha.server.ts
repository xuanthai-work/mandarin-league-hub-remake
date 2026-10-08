export const CAPTCHA_ERROR = "Xác minh bảo mật không thành công, vui lòng thử lại.";

/** Verifies a reCAPTCHA v2 token with Google. Server-only. */
export async function verifyRecaptcha(token: unknown): Promise<boolean> {
  const secret = process.env["RECAPTCHA_SECRET_KEY"];
  if (!secret || typeof token !== "string" || token.length < 20 || token.length > 4000) return false;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch (e) {
    console.error("recaptcha verify failed", e);
    return false;
  }
}
