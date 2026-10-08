import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Manual (typed-in) certificate/HSK lookups: require a valid reCAPTCHA before querying. */
export const verifyLookup = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    kind: z.enum(["certificate", "hsk"]),
    code: z.string().trim().min(1).max(60),
    name: z.string().max(200),
    captcha: z.string().max(4000),
  }).parse(d))
  .handler(async ({ data }) => {
    const { verifyRecaptcha, CAPTCHA_ERROR } = await import("./recaptcha.server");
    if (!(await verifyRecaptcha(data.captcha))) return { ok: false as const, error: CAPTCHA_ERROR, rows: [] as unknown[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const args = { _code: data.code, _name: data.name, _token: "" };
    const { data: rows, error } = data.kind === "hsk"
      ? await supabaseAdmin.rpc("verify_hsk_v2", args)
      : await supabaseAdmin.rpc("verify_certificate_v2", args);
    if (error) return { ok: false as const, error: "Không thể tra cứu lúc này. Vui lòng thử lại sau.", rows: [] as unknown[] };
    return { ok: true as const, error: "", rows: (rows ?? []) as unknown[] };
  });
