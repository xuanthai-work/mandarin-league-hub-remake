import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { APP_STATUS, CV_EXT, FILE_EXT, deptName, topicApplies, type Choice } from "./recruitment";

const ext = (n: string) => n.split(".").pop()?.toLowerCase() ?? "";

/** Signed upload slot for an applicant's CV or sample file (private bucket). */
export const createApplicationUpload = createServerFn({ method: "POST" })
  .validator((d) =>
    z.object({ filename: z.string().min(1).max(200), kind: z.enum(["cv", "file"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const allowed = data.kind === "cv" ? CV_EXT : FILE_EXT;
    if (!allowed.includes(ext(data.filename)))
      throw new Error(`Chỉ chấp nhận tệp: ${allowed.join(", ").toUpperCase()}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `pending/${crypto.randomUUID()}.${ext(data.filename)}`;
    const { data: slot, error } = await supabaseAdmin.storage
      .from("applications")
      .createSignedUploadUrl(path);
    if (error) throw new Error("Không tạo được liên kết tải tệp.");
    return { path, token: slot.token };
  });

const submitSchema = z.object({
  periodId: z.string().uuid(),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(8).max(30),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => {
      const d = new Date(v);
      const y = d.getUTCFullYear();
      return !isNaN(+d) && d.toISOString().slice(0, 10) === v && y >= 1940 && d < new Date();
    }),
  organization: z.string().trim().min(2).max(200),
  facebook_url: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v === "" || /^https?:\/\/([\w-]+\.)*(facebook\.com|fb\.com|fb\.me)(\/|$)/i.test(v),
      "Link Facebook không hợp lệ",
    )
    .default(""),
  chinese_level: z.string().trim().max(100).default(""),
  hsk_level: z.string().trim().max(20).default(""),
  intro: z.string().trim().max(3000).default(""),
  positionIds: z.array(z.string().uuid()).min(1).max(2),
  answers: z.record(z.union([z.string().max(5000), z.array(z.string().max(1000)).max(50)])),
  cvPath: z
    .string()
    .regex(/^pending\/[\w-]+\.\w+$/)
    .nullable(),
  consent: z.literal(true),
});

/** Public submission — every rule is re-checked here, never trusted from the browser. */
export const submitApplication = createServerFn({ method: "POST" })
  .validator((d) => d as unknown)
  .handler(async ({ data: raw }) => {
    const { verifyRecaptcha, CAPTCHA_ERROR } = await import("./recaptcha.server");
    if (!(await verifyRecaptcha((raw as { captcha?: unknown } | null)?.captcha)))
      return { ok: false as const, error: CAPTCHA_ERROR };
    const parsed = submitSchema.safeParse(raw);
    if (!parsed.success) {
      const LABEL: Record<string, string> = {
        full_name: "Họ và tên (ít nhất 2 ký tự)",
        email: "Email",
        phone: "Số điện thoại (8–30 ký tự)",
        date_of_birth: "Ngày sinh",
        organization: "Trường / Đơn vị (ít nhất 2 ký tự)",
        facebook_url: "Link Facebook",
        chinese_level: "Trình độ tiếng Trung",
        hsk_level: "HSK",
        intro: "Giới thiệu ngắn (10–3000 ký tự)",
        positionIds: "Nguyện vọng",
        answers: "Câu trả lời (quá dài)",
        cvPath: "Tệp CV",
        consent: "Xác nhận thông tin",
      };
      const key = String(parsed.error.issues[0]?.path[0] ?? "");
      return { ok: false as const, error: `Vui lòng kiểm tra lại: ${LABEL[key] ?? key}.` };
    }
    const data = parsed.data;
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const { data: period } = await db
      .from("recruitment_periods")
      .select("*")
      .eq("id", data.periodId)
      .maybeSingle();
    if (!period || period.status !== "open" || today < period.starts_on || today > period.ends_on)
      return { ok: false as const, error: "Đợt tuyển này hiện không nhận hồ sơ." };
    if (new Set(data.positionIds).size !== data.positionIds.length)
      return { ok: false as const, error: "Hai nguyện vọng không được trùng nhau." };
    const { data: positions } = await db
      .from("recruitment_positions")
      .select("*")
      .in("id", data.positionIds)
      .eq("period_id", period.id)
      .eq("enabled", true);
    if (!positions || positions.length !== data.positionIds.length)
      return { ok: false as const, error: "Vị trí bạn chọn không còn được tuyển." };
    const choices: Choice[] = data.positionIds.map((id) => {
      const p = positions.find((x) => x.id === id)!;
      return { position_id: p.id, department: p.department, position: p.position };
    });

    const { data: topics } = await db
      .from("recruitment_topics")
      .select("id, department, position, period_id")
      .eq("visible", true);
    const applicable = (topics ?? []).filter(
      (t) =>
        (t.period_id == null || t.period_id === period.id) &&
        (t.department == null || choices.some((c) => topicApplies(t, c))),
    );
    const { data: questions } = applicable.length
      ? await db
          .from("recruitment_questions")
          .select("id, kind, options, required")
          .eq("visible", true)
          .in(
            "topic_id",
            applicable.map((t) => t.id),
          )
      : { data: [] };
    const allowed = new Map((questions ?? []).map((q) => [q.id, q]));
    const answers: Record<string, string | string[]> = {};
    for (const [qid, v] of Object.entries(data.answers)) {
      const q = allowed.get(qid);
      if (!q) continue; // drop answers to questions not applicable
      if (q.kind === "file" && typeof v === "string" && v && !/^pending\/[\w-]+\.\w+$/.test(v))
        continue;
      answers[qid] = v;
    }
    for (const q of questions ?? []) {
      const v = answers[q.id];
      if (q.required && (!v || (Array.isArray(v) ? v.length === 0 : !v.trim())))
        return { ok: false as const, error: "Vui lòng trả lời đầy đủ các câu hỏi bắt buộc." };
    }

    const { data: row, error } = await db
      .from("candidate_applications")
      .insert({
        period_id: period.id,
        full_name: data.full_name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        date_of_birth: data.date_of_birth,
        organization: data.organization,
        facebook_url: data.facebook_url,
        chinese_level: data.chinese_level,
        hsk_level: data.hsk_level,
        intro: data.intro,
        choices,
        answers,
        cv_path: data.cvPath,
      })
      .select("code")
      .single();
    if (error) {
      if (error.code === "23505")
        return {
          ok: false as const,
          error: "Email này đã được sử dụng cho một hồ sơ trong đợt tuyển này.",
        };
      console.error(error);
      return { ok: false as const, error: "Không gửi được hồ sơ, vui lòng thử lại." };
    }

    // Confirmation email — a send failure must never fail the submission.
    try {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      await sendTemplateEmail("application-confirmation", data.email.toLowerCase(), {
        templateData: {
          fullName: data.full_name,
          email: data.email.toLowerCase(),
          code: row.code,
          positions: choices.map((c) => c.position),
          departments: [...new Set(choices.map((c) => deptName(c.department)))],
          message: data.intro,
          submittedAt: new Intl.DateTimeFormat("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date()),
        },
        idempotencyKey: `application-confirm-${row.code}`,
        replyTo: "community@themandarinleague.bond",
      });
    } catch (e) {
      console.error("application confirmation email failed", e);
    }
    return { ok: true as const, code: row.code };
  });

/** AI screening summary for a stored application or pasted text (candidates.edit). */
export const analyzeApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        applicationId: z.string().uuid().optional(),
        text: z.string().max(20000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: allowed, error: permError } = await context.supabase.rpc("has_perm", {
      _action: "candidates.edit",
    });
    if (permError) throw new Error(permError.message);
    if (allowed !== true) throw new Error("Bạn không có quyền phân tích hồ sơ này.");
    let content = data.text?.trim() ?? "";
    let cvPart: { type: "file"; data: Uint8Array; mediaType: string; filename: string } | null =
      null;
    let cvNote = "";
    if (data.applicationId) {
      const { data: app } = await context.supabase
        .from("candidate_applications")
        .select("*")
        .eq("id", data.applicationId)
        .single();
      if (!app) throw new Error("Không tìm thấy hồ sơ.");
      const answers = (app.answers ?? {}) as Record<string, string | string[]>;
      const ids = Object.keys(answers);
      const { data: qs } = ids.length
        ? await context.supabase.from("recruitment_questions").select("id, prompt").in("id", ids)
        : { data: [] };
      const choices = (app.choices ?? []) as Choice[];
      content = [
        `Nguyện vọng: ${choices.map((c, i) => `NV${i + 1}: ${deptName(c.department)} — ${c.position}`).join("; ")}`,
        `Đơn vị/công việc: ${app.organization}`,
        `Trình độ tiếng Trung: ${app.chinese_level || "—"}; HSK: ${app.hsk_level || "—"}`,
        `Giới thiệu: ${app.intro}`,
        ...(qs ?? []).map(
          (q) => `Hỏi: ${q.prompt}\nĐáp: ${[answers[q.id]].flat().join(", ") || "—"}`,
        ),
      ].join("\n");
      if (app.cv_path) {
        const { data: blob } = await context.supabase.storage
          .from("applications")
          .download(app.cv_path);
        const e = ext(app.cv_path);
        if (blob && blob.size <= 10 * 1024 * 1024) {
          const bytes = new Uint8Array(await blob.arrayBuffer());
          if (e === "pdf")
            cvPart = {
              type: "file",
              data: bytes,
              mediaType: "application/pdf",
              filename: "cv.pdf",
            };
          else if (e === "docx") {
            try {
              const { unzipSync, strFromU8 } = await import("fflate");
              const doc = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" })[
                "word/document.xml"
              ];
              if (!doc) throw new Error("no document");
              const xml = strFromU8(doc);
              const text = xml
                .replace(/<\/w:p>/g, "\n")
                .replace(/<[^>]+>/g, "")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/\n{3,}/g, "\n\n")
                .trim();
              if (text) content += `\n\n=== NỘI DUNG CV (Word) ===\n${text.slice(0, 15000)}`;
            } catch {
              cvNote = "(Không đọc được tệp CV Word.)";
            }
          } else cvNote = "(CV định dạng .doc cũ — AI không đọc được, chỉ phân tích form.)";
        } else cvNote = "(Không tải được tệp CV.)";
      }
      if (cvNote) content += `\n${cvNote}`;
    }
    if (content.length < 20) throw new Error("Nội dung quá ngắn để phân tích.");
    const { runResponsesText } = await import("./ai/responses.server");
    let summary: string;
    try {
      summary = await runResponsesText(
        getRequest(),
        "Bạn là trợ lý nhân sự của THE MANDARIN LEAGUE (cộng đồng học tiếng Trung). Phân tích hồ sơ ứng viên bằng tiếng Việt, ngắn gọn, khách quan, dựa trên cả thông tin form và tệp CV đính kèm (nếu có). Đối chiếu kinh nghiệm/kỹ năng trong CV với Ban ứng tuyển (VD: Học thuật → dạy/học tiếng Trung; Truyền thông → viết, thiết kế, video; Sự kiện → tổ chức; Nhân sự → quản lý con người). Trả về đúng 4 mục có tiêu đề: 1) Tóm tắt nhanh (2 câu), 2) Kỹ năng & kinh nghiệm chính (gạch đầu dòng, ghi rõ nguồn CV hay form), 3) Mức độ phù hợp với Ban ứng tuyển (Phù hợp cao / Tiềm năng / Cần phỏng vấn thêm, kèm điểm mạnh và điểm cần lưu ý), 4) Gợi ý 2–3 câu hỏi phỏng vấn. Không suy đoán thông tin không có. Không nhắc lại email, số điện thoại, địa chỉ. Dưới 350 từ.",
        [{ role: "user", content: cvPart ? [{ type: "text", text: content }, cvPart] : content }],
      );
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 402)
        throw new Error(
          "Hết hạn mức AI. Vui lòng nạp thêm credit trong Settings → Plans & credits.",
        );
      if (status === 429) throw new Error("AI đang quá tải, vui lòng thử lại sau ít phút.");
      throw new Error("Không phân tích được bằng AI lúc này.");
    }
    if (data.applicationId)
      await context.supabase
        .from("candidate_applications")
        .update({ ai_summary: summary })
        .eq("id", data.applicationId);
    return { summary };
  });

export { APP_STATUS };
