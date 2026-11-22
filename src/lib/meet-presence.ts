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

/** Một dòng cảnh báo cho phòng chung đang có người, hoặc null nếu không có. */
export function sharedRoomWarning<T extends { id?: string; kind: string; label: string }>(
  rooms: T[],
  presence: Map<string, RoomPresence> | Record<string, RoomPresence>,
  roomIdOf?: (room: T) => string,
): string | null {
  const getP = (id: string): RoomPresence | undefined => {
    if (presence instanceof Map) return presence.get(id);
    return presence[id];
  };

  const busyShared: string[] = [];
  for (const r of rooms) {
    if (r.kind !== "shared") continue;
    const id = roomIdOf ? roomIdOf(r) : r.id;
    if (!id) continue;
    const p = getP(id);
    if (p && p.active && p.count > 0) {
      busyShared.push(`${r.label} (${p.count} người)`);
    }
  }

  if (busyShared.length === 0) return null;
  return `Phòng chung đang có người họp: ${busyShared.join(", ")}. Hãy chọn phòng chung khác.`;
}
