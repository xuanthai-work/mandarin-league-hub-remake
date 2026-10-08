import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  activity_id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().regex(/^[0-9+ .()-]{8,20}$/),
  organization: z.string().trim().max(200).default(""),
  message: z.string().trim().max(1500).default(""),
});

const fmt = (d: Date | string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));

/** Public activity registration — every rule re-checked on the server. */
export const submitActivityRegistration = createServerFn({ method: "POST" })
  .inputValidator((d) => d as unknown)
  .handler(async ({ data: raw }) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const LABEL: Record<string, string> = { full_name: "Họ và tên", email: "Email", phone: "Số điện thoại", organization: "Đơn vị / Trường", message: "Lời nhắn (quá dài)" };
      const key = String(parsed.error.issues[0]?.path[0] ?? "");
      return { ok: false as const, error: `Vui lòng kiểm tra lại: ${LABEL[key] ?? key}.` };
    }
    const d = parsed.data;
    const email = d.email.toLowerCase();
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: a } = await db.from("activities").select("*").eq("id", d.activity_id).maybeSingle();
    const now = Date.now();
    const end = a?.end_time ? Date.parse(a.end_time) : a?.start_time ? Date.parse(a.start_time) : null;
    if (!a || a.manual_status !== "published" || a.deleted_at || !a.require_registration || a.registration_url || (end !== null && now > end))
      return { ok: false as const, error: "Hoạt động này hiện không nhận đăng ký trên website." };
    if (a.registration_deadline && now > Date.parse(a.registration_deadline)) return { ok: false as const, error: "Đã hết hạn đăng ký." };
    if (a.max_participants > 0) {
      const { count } = await db.from("activity_registrations").select("id", { count: "exact", head: true }).eq("activity_id", a.id).in("status", ["PENDING", "APPROVED", "COMPLETED"]);
      if ((count ?? 0) >= a.max_participants) return { ok: false as const, error: "Hoạt động đã đủ số lượng đăng ký." };
    }
    const { count: dup } = await db.from("activity_registrations").select("id", { count: "exact", head: true }).eq("activity_id", a.id).eq("email", email).in("status", ["PENDING", "APPROVED"]);
    if ((dup ?? 0) > 0) return { ok: false as const, error: "Email này đã đăng ký hoạt động này." };

    const { data: row, error } = await db.from("activity_registrations").insert({ ...d, email }).select("code, created_at").single();
    if (error || !row) { console.error(error); return { ok: false as const, error: "Không gửi được đăng ký, vui lòng thử lại." }; }
    const submittedAt = fmt(row.created_at);
    try {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      await sendTemplateEmail("activity-registration", email, {
        templateData: { fullName: d.full_name, code: row.code, activityTitle: a.title, startTime: a.start_time ? fmt(a.start_time) : "Đang cập nhật", location: a.location_detail || a.location_type, phone: d.phone, submittedAt },
        idempotencyKey: `activity-reg-${row.code}`,
        replyTo: "community@themandarinleague.bond",
      });
    } catch (e) { console.error("activity registration email failed", e); }
    return { ok: true as const, code: row.code, submittedAt };
  });
