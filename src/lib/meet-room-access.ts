import type { RoomKind } from "./meet-auto";

export type { RoomKind };
export type AttendanceScope = "all" | "own";

/**
 * Người có scope này được tạo/sửa/xóa phòng này không.
 * - scope "all": mọi phòng.
 * - scope "own": phòng "work" của đúng Ban mình.
 * - "club": chỉ scope "all".
 */
export function canManageRoom(
  scope: AttendanceScope | null | undefined,
  actor: { userId: string; department: string | null | undefined },
  room: { kind: RoomKind; department: string | null; createdBy?: string | null },
): boolean {
  if (scope === "all") return true;
  if (scope !== "own") return false;
  if (room.kind === "work") return !!actor.department && room.department === actor.department;
  return false;
}
