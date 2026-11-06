import { csvCell } from "@/lib/csv";
import { ENROLL_STATUS } from "@/lib/course-settings";
import type { CourseType } from "@/lib/programs";

export type Enrollment = {
  id: string;
  code: string;
  level: number;
  full_name: string;
  email: string;
  phone: string;
  current_level: string;
  goal: string;
  message: string;
  status: string;
  admin_note: string;
  created_at: string;
  course_id: string | null;
  hsk_class_id: string | null;
};

export type FeeInfo = { fee_type: "free" | "paid"; fee_amount: number };
export type ClassRef = { id: string; name: string } & FeeInfo;
export type ProgramRef = { id: string; title: string; course_type: CourseType; price: number };

export type EnrollmentTarget = {
  kind: "class" | "program" | "level";
  label: string;
  fee?: FeeInfo | undefined;
};

/** "Vừa xong" / "N phút trước" / "N giờ trước" / "N ngày trước" (< 7 ngày), sau đó là ngày dd/mm/yyyy. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const s = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return "Vừa xong";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}

/** Lớp/chương trình mà đơn đăng ký vào, kèm học phí để biết có cần hướng dẫn đóng phí không. */
export function enrollmentTarget(
  r: Pick<Enrollment, "hsk_class_id" | "course_id" | "level">,
  classes: ClassRef[],
  programs: ProgramRef[],
): EnrollmentTarget {
  if (r.hsk_class_id) {
    const c = classes.find((x) => x.id === r.hsk_class_id);
    return {
      kind: "class",
      label: c?.name ?? `HSK ${r.level}`,
      fee: c ? { fee_type: c.fee_type, fee_amount: c.fee_amount } : undefined,
    };
  }
  if (r.course_id) {
    const p = programs.find((x) => x.id === r.course_id);
    return {
      kind: "program",
      label: p?.title ?? "Chương trình đã xóa",
      fee: p
        ? { fee_type: p.course_type === "FREE_COMMUNITY" ? "free" : "paid", fee_amount: p.price }
        : undefined,
    };
  }
  return { kind: "level", label: `HSK ${r.level}` };
}

export type GroupLink = { hsk_class_id: string | null; course_id: string | null; zalo_url: string };
export type BulkSkipReason = "not_pending" | "no_target" | "paid" | "no_link";

export const SKIP_LABEL: Record<BulkSkipReason, string> = {
  not_pending: "không còn ở trạng thái chờ duyệt",
  no_target: "đăng ký theo cấp độ hoặc lớp/chương trình đã xóa",
  paid: "có học phí, cần duyệt từng đơn để ghi hướng dẫn đóng phí",
  no_link: "lớp/chương trình chưa lưu link nhóm Zalo",
};

/** Tách đơn duyệt được hàng loạt (kèm link Zalo của lớp/chương trình) và đơn phải bỏ qua. */
export function planBulkApprove(
  rows: Enrollment[],
  targetOf: (r: Enrollment) => EnrollmentTarget,
  links: GroupLink[],
) {
  const ready: { row: Enrollment; zaloLink: string }[] = [];
  const skipped: { row: Enrollment; reason: BulkSkipReason }[] = [];
  for (const r of rows) {
    const t = targetOf(r);
    const link =
      links
        .find((l) =>
          r.hsk_class_id
            ? l.hsk_class_id === r.hsk_class_id
            : r.course_id
              ? l.course_id === r.course_id
              : false,
        )
        ?.zalo_url.trim() ?? "";
    if (r.status !== "pending") skipped.push({ row: r, reason: "not_pending" });
    else if (t.kind === "level" || !t.fee) skipped.push({ row: r, reason: "no_target" });
    else if (t.fee.fee_type === "paid") skipped.push({ row: r, reason: "paid" });
    else if (!link) skipped.push({ row: r, reason: "no_link" });
    else ready.push({ row: r, zaloLink: link });
  }
  return { ready, skipped };
}

const CSV_HEAD = [
  "Mã đơn",
  "Họ tên",
  "Email",
  "SĐT",
  "Lớp / Chương trình",
  "Cấp độ",
  "Trình độ hiện tại",
  "Mục tiêu",
  "Lời nhắn",
  "Trạng thái",
  "Ngày đăng ký",
  "Ghi chú nội bộ",
];

/** CSV (chưa có BOM) của các đơn; mọi ô qua csvCell để chặn công thức. */
export function toEnrollmentCsv(rows: Enrollment[], labelOf: (r: Enrollment) => string): string {
  const body = rows.map((r) => [
    r.code,
    r.full_name,
    r.email,
    r.phone,
    labelOf(r),
    r.course_id ? "" : `HSK ${r.level}`,
    r.current_level,
    r.goal,
    r.message,
    ENROLL_STATUS[r.status]?.label ?? r.status,
    new Date(r.created_at).toLocaleString("vi-VN"),
    r.admin_note,
  ]);
  return [CSV_HEAD, ...body].map((line) => line.map(csvCell).join(",")).join("\n");
}
