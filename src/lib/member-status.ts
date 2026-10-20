export type MemberStatus = "active" | "on_leave" | "left";
export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = { active: "Đang hoạt động", on_leave: "Tạm dừng hoạt động", left: "Đã rời" };

/** Whole days from `today` until `until` (negative = overdue). */
export function leaveDaysLeft(until: string | null | undefined, today = new Date()) {
  if (!until) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const [y, m, d] = until.split("-").map(Number);
  return Math.round((new Date(y!, m! - 1, d!).getTime() - t) / 86400000);
}
