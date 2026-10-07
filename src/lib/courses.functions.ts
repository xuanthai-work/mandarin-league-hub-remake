import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const submitSchema = z.object({
  level: z.number().int().min(0).max(6),
  course_id: z.string().uuid().optional(),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().regex(/^[0-9+ .()-]{8,20}$/),
  current_level: z.string().trim().max(120).default(""),
  goal: z.string().trim().max(120).default(""),
  message: z.string().trim().max(1500).default(""),
});

const fmtTime = (d: Date) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);

/** Public course registration — rules re-checked on the server. */
export const submitEnrollment = createServerFn({ method: "POST" })
  .inputValidator((d) => d as unknown)
  .handler(async ({ data: raw }) => {
    const parsed = submitSchema.safeParse(raw);
    if (!parsed.success) {
      const LABEL: Record<string, string> = { full_name: "Họ và tên", email: "Email", phone: "Số điện thoại", message: "Lời nhắn (quá dài)" };
      const key = String(parsed.error.issues[0]?.path[0] ?? "");
      return { ok: false as const, error: `Vui lòng kiểm tra lại: ${LABEL[key] ?? key}.` };
    }
    const d = parsed.data;
    const email = d.email.toLowerCase();
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    if (d.course_id) {
      const { data: c } = await db.from("courses").select("status, is_published, deleted_at, registration_url").eq("id", d.course_id).maybeSingle();
      if (!c || !c.is_published || c.deleted_at || c.status !== "enrolling" || c.registration_url)
        return { ok: false as const, error: "Chương trình này hiện không nhận đăng ký trên website." };
    } else {
      if (d.level < 1) return { ok: false as const, error: "Khóa học không hợp lệ." };
      const { data: setting } = await db.from("course_settings").select("*").eq("level", d.level).maybeSingle();
      if (!setting?.registration_open) return { ok: false as const, error: "Khóa học này hiện đã đóng đăng ký." };
    }
    let dup = db.from("course_enrollments").select("id", { count: "exact", head: true }).eq("email", email).eq("status", "pending");
    dup = d.course_id ? dup.eq("course_id", d.course_id) : dup.eq("level", d.level).is("course_id", null);
    const { count } = await dup;
    if ((count ?? 0) > 0) return { ok: false as const, error: "Email này đã có đơn đăng ký khóa này đang chờ xét duyệt." };

    const { data: row, error } = await db.from("course_enrollments").insert({ ...d, email }).select("code, created_at").single();
    if (error || !row) { console.error(error); return { ok: false as const, error: "Không gửi được đơn, vui lòng thử lại." }; }
    const submittedAt = fmtTime(new Date(row.created_at));
    try {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      await sendTemplateEmail("enrollment-confirmation", email, {
        templateData: { fullName: d.full_name, code: row.code, level: d.level, phone: d.phone, submittedAt },
        idempotencyKey: `enrollment-confirm-${row.code}`,
        replyTo: "community@themandarinleague.bond",
      });
    } catch (e) { console.error("enrollment confirmation email failed", e); }
    return { ok: true as const, code: row.code, submittedAt };
  });

const reviewSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]),
  note: z.string().trim().max(1000).default(""),
  zaloLink: z.string().trim().max(500).default(""),
  feeNote: z.string().trim().max(1000).default(""),
});

/** Admin / Ban Chuyên môn review. RLS limits who can update; approval emails the invite. */
export const reviewEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => reviewSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.zaloLink && !/^https:\/\/(zalo\.me|chat\.zalo\.me)\//i.test(data.zaloLink))
      return { ok: false as const, error: "Link nhóm Zalo phải bắt đầu bằng https://zalo.me/" };
    if (data.status === "approved" && !data.zaloLink) return { ok: false as const, error: "Vui lòng nhập link nhóm Zalo của lớp." };
    const { data: row, error } = await context.supabase.from("course_enrollments")
      .update({ status: data.status, admin_note: data.note, reviewed_by: context.userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.id).select("code, full_name, email, level").maybeSingle();
    if (error || !row) return { ok: false as const, error: "Bạn không có quyền hoặc đơn không tồn tại." };
    let emailed = false;
    if (data.status === "approved") {
      try {
        const { sendTemplateEmail } = await import("./email-templates/send-email");
        const r = await sendTemplateEmail("enrollment-approved", row.email, {
          templateData: { fullName: row.full_name, code: row.code, level: row.level, zaloLink: data.zaloLink, feeNote: data.feeNote },
          idempotencyKey: `enrollment-approved-${row.code}-${data.zaloLink}`,
          replyTo: "community@themandarinleague.bond",
        });
        emailed = !!r?.sent;
      } catch (e) { console.error("enrollment approval email failed", e); }
    }
    return { ok: true as const, emailed };
  });
