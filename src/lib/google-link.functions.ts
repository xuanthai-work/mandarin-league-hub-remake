import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkGoogleTokenInfo } from "./google-id-token";

const clientId = () => process.env["GOOGLE_OAUTH_CLIENT_ID"]?.trim() || "";

/** The OAuth client ID is public (it ships in Google's sign-in button); null when not configured. */
export const getGoogleClientId = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ clientId: clientId() || null }));

export const linkMyGoogleAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ idToken: z.string().min(20).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    const id = clientId();
    if (!id) throw new Error("Tính năng liên kết Google chưa được bật.");

    // 1. Google verifies the token; we only trust what tokeninfo returns.
    let info: unknown = null;
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(data.idToken)}`,
      );
      if (res.ok) info = await res.json();
    } catch (e) {
      console.error("google tokeninfo failed", e);
    }
    const identity = checkGoogleTokenInfo(info, id, Math.floor(Date.now() / 1000));
    if (!identity) throw new Error("Không xác minh được tài khoản Google, vui lòng thử lại.");

    // 2. The caller's own member profile, resolved from the session (never from the client).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: acc, error: accErr } = await supabaseAdmin
      .from("member_accounts")
      .select("member_id")
      .eq("user_id", context.userId)
      .eq("account_status", "active")
      .maybeSingle();
    if (accErr) throw new Error(accErr.message);
    if (!acc) throw new Error("Tài khoản của bạn chưa gắn với hồ sơ thành viên.");

    // 3. One Google account belongs to one member only.
    const { data: taken, error: takenErr } = await supabaseAdmin
      .from("member_google_accounts")
      .select("member_id")
      .eq("google_sub", identity.sub)
      .maybeSingle();
    if (takenErr) throw new Error(takenErr.message);
    if (taken && taken.member_id !== acc.member_id)
      throw new Error("Tài khoản Google này đã được liên kết với một thành viên khác.");

    // 4. Link (or re-link to a different Google account).
    const { error } = await supabaseAdmin.from("member_google_accounts").upsert(
      {
        member_id: acc.member_id,
        google_sub: identity.sub,
        google_email: identity.email,
        linked_at: new Date().toISOString(),
      },
      { onConflict: "member_id" },
    );
    if (error) throw new Error(error.message);
    return { googleEmail: identity.email };
  });
