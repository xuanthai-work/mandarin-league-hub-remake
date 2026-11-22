import { meetingMinutes } from "./meet-attendance";

export const AUTO_MIN_MINUTES = 30;
export type AutoStatus =
  "running" | "scored" | "too_short" | "no_members" | "unknown_room" | "error";

/** Xếp loại một buổi họp theo giờ: chưa kết thúc / quá ngắn / đủ điều kiện chấm. */
export function classifyConference(
  start?: string | null,
  end?: string | null,
): "not_ended" | "too_short" | "ok" {
  if (!start || !end) return "not_ended";
  const minutes = meetingMinutes(start, end);
  if (minutes === null) return "not_ended";
  if (minutes < AUTO_MIN_MINUTES) return "too_short";
  return "ok";
}

/** Lý do ghi vào sổ điểm, tối đa 300 ký tự, ngày theo múi giờ Asia/Ho_Chi_Minh. */
export function formatAutoReason(
  kind: "work" | "club",
  departmentLabel: string | null,
  startIso: string,
): string {
  const dateObj = new Date(startIso);
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const dateStr = formatter.format(dateObj);
  const reason =
    kind === "work"
      ? `Điểm danh Họp ban ${departmentLabel?.trim() || "Ban"} - ${dateStr} (tự động qua Google Meet)`
      : `Điểm danh Họp toàn thể - ${dateStr} (tự động qua Google Meet)`;
  return reason.length > 300 ? reason.slice(0, 300) : reason;
}
