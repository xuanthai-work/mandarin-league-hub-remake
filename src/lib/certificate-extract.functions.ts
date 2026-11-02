import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExtractedCertificate = {
  holder_name: string; holder_name_zh: string; certificate_code: string; program_name: string;
  certificate_type: "completion" | "achievement" | "participation" | "appreciation" | "other" | "";
  classification: string; issue_date: string; issuer: string; language: string;
};

const outSchema = z.object({
  holder_name: z.string().max(200).catch(""),
  holder_name_zh: z.string().max(100).catch(""),
  certificate_code: z.string().max(60).catch(""),
  program_name: z.string().max(300).catch(""),
  certificate_type: z.string().catch(""),
  classification: z.string().max(120).catch(""),
  issue_date: z.string().catch(""),
  issuer: z.string().max(200).catch(""),
  language: z.string().max(40).catch(""),
});

export const extractCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    base64: z.string().min(10).max(1_500_000),
    mediaType: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]),
    allowedTypes: z.array(z.string().max(40)).max(20),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Chỉ Quản trị viên được dùng AI đọc chứng nhận.");
    const { runResponsesText } = await import("./ai/responses.server");
    const instructions = `Bạn đọc ảnh/PDF giấy chứng nhận (có thể tiếng Việt, tiếng Trung giản/phồn thể, tiếng Anh hoặc song ngữ).
Chỉ trích xuất thông tin THẬT SỰ in trên tài liệu; trường nào không thấy để chuỗi rỗng, tuyệt đối không bịa.
Trả về đúng một đối tượng JSON, không markdown:
{"holder_name": họ tên người nhận dạng Latin/tiếng Việt có dấu (nếu chỉ có chữ Hán thì ghi pinyin có dấu),
"holder_name_zh": tên chữ Hán nếu có,
"certificate_code": mã/số hiệu in trên giấy (giữ nguyên, bỏ khoảng trắng),
"program_name": tên khóa học/chương trình/sự kiện, giữ ngôn ngữ gốc, nếu song ngữ ưu tiên tiếng Việt,
"certificate_type": một trong ${data.allowedTypes.join(", ")} hoặc "",
"classification": xếp loại/vai trò (vd Xuất sắc, 优秀, Excellent),
"issue_date": ngày cấp dạng YYYY-MM-DD hoặc "",
"issuer": đơn vị cấp,
"language": ngôn ngữ chính của giấy (vi/zh/en/mixed)}`;
    const text = await runResponsesText(getRequest(), instructions, [{
      role: "user",
      content: [
        { type: "text", text: "Trích xuất thông tin giấy chứng nhận này." },
        { type: "file", data: data.base64, mediaType: data.mediaType, ...(data.mediaType === "application/pdf" ? { filename: "certificate.pdf" } : {}) },
      ],
    }]);
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    let out: z.infer<typeof outSchema>;
    try { out = outSchema.parse(JSON.parse(json)); } catch { throw new Error("AI không đọc được tài liệu này. Vui lòng nhập tay."); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(out.issue_date)) out.issue_date = "";
    if (!data.allowedTypes.includes(out.certificate_type)) out.certificate_type = "";
    out.certificate_code = out.certificate_code.replace(/\s+/g, "").toUpperCase();
    return out as ExtractedCertificate;
  });
