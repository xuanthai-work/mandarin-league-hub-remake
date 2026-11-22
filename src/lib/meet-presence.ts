export const PRESENCE_TTL_MS = 60_000; // dùng lại kết quả trong 60 giây
export const PRESENCE_CLAIM_MS = 30_000; // một tiến trình giữ việc làm mới tối đa 30 giây

export type RoomPresence = {
  roomId: string;
  active: boolean; // có buổi họp đang diễn ra
  count: number; // số người đang ở trong
  checkedAt: string; // ISO
  stale?: boolean | undefined; // true khi không làm mới được và đang dùng dữ liệu cũ
};

/** true khi kết quả còn mới (checkedAt trong vòng ttlMs so với now). Đầu vào lỗi/ rỗng thì false. */
export function isPresenceFresh(
  checkedAt: string | null | undefined,
  now = Date.now(),
  ttlMs = PRESENCE_TTL_MS,
): boolean {
  if (!checkedAt) return false;
  const time = Date.parse(checkedAt);
  if (!Number.isFinite(time)) return false;
  const diff = now - time;
  return diff >= 0 && diff < ttlMs;
}

/** Nhãn trạng thái: "Trống" hoặc "Đang họp: N người". */
export function presenceLabel(p: Pick<RoomPresence, "active" | "count"> | undefined): string {
  if (!p) return "Chưa rõ";
  if (p.active && p.count > 0) {
    return `Đang họp: ${p.count} người`;
  }
  return "Trống";
}
