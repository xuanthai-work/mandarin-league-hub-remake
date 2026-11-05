import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  getRequestUrl,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LIBRARY_SESSION_SECONDS, librarySessionSchema, passTokenSchema } from "./member-library";

const COOKIE = "tml_library_access";

export const verifyLibraryPass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => passTokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: rows, error } = await context.supabase.rpc("verify_member_library_pass", {
      _pass: data,
    });
    if (error) throw new Error("Không thể xác thực lúc này. Vui lòng thử lại.");
    const grant = rows?.[0];
    if (!grant) {
      deleteCookie(COOKIE, { path: "/" });
      return { ok: false as const };
    }
    setCookie(COOKIE, grant.session_token, {
      httpOnly: true,
      secure: getRequestUrl().protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: LIBRARY_SESSION_SECONDS,
    });
    return { ok: true as const };
  });

export const getLibraryAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const session = librarySessionSchema.safeParse(getCookie(COOKIE));
    if (!session.success) return { allowed: false };
    const { data, error } = await context.supabase.rpc("has_member_library_access", {
      _session: session.data,
    });
    if (error) throw new Error("Không thể kiểm tra quyền truy cập. Vui lòng thử lại.");
    if (!data) deleteCookie(COOKIE, { path: "/" });
    return { allowed: data === true };
  });
