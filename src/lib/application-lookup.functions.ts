import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { deptName, type Choice } from "./recruitment";

export type LookupResult = {
  code: string; full_name: string; period: string; created_at: string; status: string;
  choices: { department: string; position: string }[]; message: string;
};

// Best-effort per-IP throttle (per server instance): 8 lookups per 10 minutes.
const hits = new Map<string, number[]>();
const WINDOW = 10 * 60_000, LIMIT = 8;

/** Public, minimal-field lookup by application code or email. Never returns contact data, answers, files or notes. */
export const lookupApplication = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ query: z.string().trim().min(3).max(200), captcha: z.string().max(4000) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true; results: LookupResult[] } | { ok: false; error: string }> => {
    const { verifyRecaptcha, CAPTCHA_ERROR } = await import("./recaptcha.server");
    if (!(await verifyRecaptcha(data.captcha))) return { ok: false, error: CAPTCHA_ERROR };
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
    if (list.length >= LIMIT) return { ok: false, error: "Bạn tra cứu quá nhiều lần. Vui lòng thử lại sau 10 phút." };
    list.push(now); hits.set(ip, list);
    await new Promise((r) => setTimeout(r, 400));

    const q = data.query.trim();
    const isEmail = q.includes("@");
    if (!isEmail && !/^TML-APP-\d{4}-\d{6}$/i.test(q)) return { ok: true, results: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let sel = supabaseAdmin.from("candidate_applications").select("code, full_name, choices, status, created_at, candidate_message, recruitment_periods(name)").order("created_at", { ascending: false }).limit(10);
    sel = isEmail ? sel.ilike("email", q.replace(/[%_\\]/g, "\\$&")) : sel.eq("code", q.toUpperCase());
    const { data: rows, error } = await sel;
    if (error) return { ok: false, error: "Không thể tra cứu lúc này. Vui lòng thử lại sau." };
    return {
      ok: true,
      results: (rows ?? []).map((r) => ({
        code: r.code, full_name: r.full_name, status: r.status, created_at: r.created_at, message: r.candidate_message ?? "",
        period: (r.recruitment_periods as { name: string } | null)?.name ?? "",
        choices: ((r.choices ?? []) as Choice[]).map((c) => ({ department: deptName(c.department), position: c.position })),
      })),
    };
  });
