import { MEET_MIN_MINUTES, meetingMinutes } from "./meet-attendance";

export const AUTO_MIN_MINUTES = MEET_MIN_MINUTES;
/** Mức điểm đóng góp nhận được cho mỗi buổi họp (5 điểm cho mọi loại phòng, khớp record_meet_attendance). */
export const MEET_POINTS = 5;
export type AutoStatus =
  "running" | "scored" | "too_short" | "no_members" | "unknown_room" | "error";

export type RoomKind = "work" | "club";

/** Loại điểm gọi vào record_meet_attendance: 'work' cho phòng Ban, 'club' cho họp toàn thể. Cả hai đều cho 5 điểm nhưng phân biệt quyền chấm. */
export function scoringKindFor(kind: RoomKind): "work" | "club" {
  return kind;
}

/** Tách người được tính điểm và người ngoài Ban. Phòng 'work' chỉ tính thành viên có department === roomDepartment; 'club' tính tất cả. */
export function pickScorable<T extends { department: string }>(
  kind: RoomKind,
  roomDepartment: string | null,
  matched: T[],
): { scored: T[]; outside: T[] } {
  if (kind === "club") {
    return { scored: [...matched], outside: [] };
  }
  if (!roomDepartment) {
    return { scored: [], outside: [...matched] };
  }
  const scored: T[] = [];
  const outside: T[] = [];
  for (const m of matched) {
    if (m.department === roomDepartment) {
      scored.push(m);
    } else {
      outside.push(m);
    }
  }
  return { scored, outside };
}

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
  kind: RoomKind,
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
  let reason: string;
  if (kind === "work") {
    reason = `Điểm danh Họp ban ${departmentLabel?.trim() || "Ban"} - ${dateStr} (tự động qua Google Meet)`;
  } else {
    reason = `Điểm danh Họp toàn thể - ${dateStr} (tự động qua Google Meet)`;
  }
  return reason.length > 300 ? reason.slice(0, 300) : reason;
}
