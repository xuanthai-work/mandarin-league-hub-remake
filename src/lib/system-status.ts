export type StatusLevel = "ok" | "partial" | "missing";

export type Integration = {
  id: string;
  label: string;
  /** Tính năng hỏng khi thiếu, viết cho Admin đọc. */
  affects: string;
  required: string[];
  /** Thiếu thì vẫn chạy nhưng dùng giá trị mặc định → "partial". */
  optional: string[];
};

export type IntegrationStatus = {
  id: string;
  label: string;
  affects: string;
  level: StatusLevel;
  /** Chỉ tên biến còn thiếu, không bao giờ chứa giá trị. */
  missing: string[];
};

export const INTEGRATIONS: Integration[] = [
  {
    id: "supabase_admin",
    label: "Supabase quản trị",
    affects: "Tạo tài khoản, duyệt đơn, tải tệp ứng viên và mọi thao tác quản trị phía server.",
    required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    optional: [],
  },
  {
    id: "recaptcha",
    label: "reCAPTCHA",
    affects: "Mọi form công khai: nộp đơn tuyển dụng, đăng ký khóa học và hoạt động, tra cứu.",
    required: ["RECAPTCHA_SECRET_KEY"],
    optional: [],
  },
  {
    id: "email",
    label: "Gửi email (Resend)",
    affects: "Thư kết quả khi duyệt đơn tuyển dụng, khóa học và hoạt động.",
    required: ["RESEND_API_KEY"],
    optional: ["RESEND_FROM"],
  },
  {
    id: "ai_gateway",
    label: "AI nội bộ",
    affects: "Tóm tắt ứng viên, soạn kế hoạch onboarding, đọc chứng nhận bằng AI.",
    required: ["LOVABLE_API_KEY"],
    optional: [],
  },
  {
    id: "gemini",
    label: "TML AI (Gemini)",
    affects: "Trợ lý hỏi đáp TML AI trên trang công khai.",
    required: ["GOOGLE_API_KEY"],
    optional: [],
  },
];

const isSet = (env: Record<string, string | undefined>, key: string) =>
  typeof env[key] === "string" && env[key]!.trim().length > 0;

export function buildSystemStatus(
  env: Record<string, string | undefined>,
  integrations: Integration[] = INTEGRATIONS,
): IntegrationStatus[] {
  return integrations.map((it) => {
    const missingRequired = it.required.filter((k) => !isSet(env, k));
    const missingOptional = it.optional.filter((k) => !isSet(env, k));
    const level: StatusLevel =
      missingRequired.length > 0 ? "missing" : missingOptional.length > 0 ? "partial" : "ok";
    return {
      id: it.id,
      label: it.label,
      affects: it.affects,
      level,
      missing: [...missingRequired, ...missingOptional],
    };
  });
}
