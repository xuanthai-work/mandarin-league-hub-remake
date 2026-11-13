import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/** Private bucket that holds feedback screenshots under `<auth user id>/…`. */
export const FEEDBACK_BUCKET = "feedback-screenshots";

export const FEEDBACK_TYPES = ["bug", "improvement", "other"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_STATUSES = ["pending", "in_progress", "resolved", "closed"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_TYPE_LABEL: Record<FeedbackType, string> = {
  bug: "Báo lỗi",
  improvement: "Cải tiến",
  other: "Ý kiến khác",
};

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  pending: "Chờ xử lý",
  in_progress: "Đang xử lý",
  resolved: "Đã giải quyết",
  closed: "Đã ghi nhận",
};

/** Writer columns embedded with every row; nothing else of the members table is exposed. */
export type FeedbackMember = {
  full_name: string;
  member_code: string;
  department: string;
  position: string | null;
  avatar_path: string | null;
};

export type FeedbackItem = {
  id: string;
  member_id: string;
  type: FeedbackType;
  title: string;
  content: string;
  /** Storage path inside FEEDBACK_BUCKET, not a public URL. */
  screenshot_url: string;
  status: FeedbackStatus;
  admin_note: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  member: FeedbackMember | null;
  resolver: { full_name: string } | null;
};

export type NewFeedback = {
  type: FeedbackType;
  title: string;
  content: string;
  /** Path returned by uploadFeedbackScreenshot(). */
  screenshot_path?: string;
};

export type FeedbackDecision = {
  status: FeedbackStatus;
  admin_note: string;
};

/** My own member id (from the session), used when the page builds a new submission. */
export async function myMemberId(): Promise<string | null> {
  const { data } = await supabase.rpc("my_account");
  const me = data as { member?: { id?: string } | null } | null;
  return me?.member?.id ?? null;
}

/**
 * Every submission the caller may read: RLS returns their own rows, or every row for a
 * reviewer (feedback.review). Writer and resolver profiles travel in one request.
 */
export function useFeedbacks(enabled = true) {
  return useQuery({
    queryKey: ["admin-feedbacks"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedbacks")
        .select(
          "*, member:members!feedbacks_member_id_fkey(full_name, member_code, department, position, avatar_path), resolver:members!feedbacks_resolved_by_fkey(full_name)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackItem[];
    },
  });
}

/** Send one submission on behalf of the signed-in member (member id always from the session). */
export async function createFeedback(input: NewFeedback): Promise<void> {
  const memberId = await myMemberId();
  if (!memberId) throw new Error("Không tìm thấy hồ sơ thành viên của tài khoản này");

  const title = input.title.trim();
  const content = input.content.trim();
  if (title.length < 3 || title.length > 200) throw new Error("Tiêu đề phải từ 3 đến 200 ký tự");
  if (content.length < 10 || content.length > 5000)
    throw new Error("Nội dung phải từ 10 đến 5000 ký tự");

  const { error } = await supabase.from("feedbacks").insert({
    member_id: memberId,
    type: input.type,
    title,
    content,
    screenshot_url: input.screenshot_path ?? "",
    status: "pending",
  });
  if (error) throw new Error(error.message);
}

/** Reviewer answer: status + reply. The database stamps resolved_by / resolved_at. */
export async function updateFeedbackStatus(id: string, decision: FeedbackDecision): Promise<void> {
  const note = decision.admin_note.trim();
  if (note.length > 2000) throw new Error("Phản hồi tối đa 2000 ký tự");

  const { data, error } = await supabase
    .from("feedbacks")
    .update({
      status: decision.status,
      admin_note: note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  // RLS silently updates 0 rows when the caller lacks review rights.
  if (!data?.length) throw new Error("Bạn không có quyền xử lý đơn nhận xét này");
}

/** Upload a screenshot into the private bucket; returns the storage path to save on the row. */
export async function uploadFeedbackScreenshot(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Chỉ đính kèm được tệp ảnh");
  if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh chụp màn hình tối đa 5MB");

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(FEEDBACK_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw new Error("Tải ảnh thất bại: " + error.message);
  return path;
}

/** Short-lived signed URL for one screenshot (the bucket is private). */
export async function feedbackScreenshotUrl(path: string): Promise<string> {
  if (!path) return "";
  const { data } = await supabase.storage.from(FEEDBACK_BUCKET).createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? "";
}

export type FeedbackErrorInfo = { message: string; detail: string };

/**
 * Turn a PostgREST / network failure into a Vietnamese explanation the admin can act on,
 * with the raw message kept as a detail line for debugging.
 */
export function describeFeedbackError(error: unknown): FeedbackErrorInfo {
  const e = error as { code?: string; message?: string } | null;
  const code = e?.code ?? "";
  const raw = e?.message ?? (error instanceof Error ? error.message : "");

  if (code === "PGRST205" || code === "42P01" || /could not find the table/i.test(raw)) {
    return {
      message:
        "Mô-đun Nhận xét chưa được khởi tạo trên máy chủ (thiếu bảng feedbacks). Vui lòng báo Ban Công nghệ & Hệ thống chạy migration 0081_feedbacks.sql.",
      detail: raw,
    };
  }
  if (/^PGRST20[0-9]$/.test(code) || /relationship|schema cache/i.test(raw)) {
    return {
      message:
        "Máy chủ chưa nhận diện được quan hệ dữ liệu của đơn nhận xét. Vui lòng báo Ban Công nghệ & Hệ thống.",
      detail: raw,
    };
  }
  if (/permission denied|row-level security|jwt/i.test(raw)) {
    return {
      message:
        "Tài khoản chưa có quyền đọc đơn nhận xét này. Vui lòng đăng nhập lại hoặc báo Ban Công nghệ & Hệ thống.",
      detail: raw,
    };
  }
  if (!raw) {
    return {
      message: "Không tải được danh sách nhận xét. Vui lòng thử lại sau ít phút.",
      detail: "",
    };
  }
  return { message: raw, detail: code ? `${code} · ${raw}` : "" };
}
