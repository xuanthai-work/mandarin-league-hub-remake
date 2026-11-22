import type { RoomKind } from "./meet-auto";

export type { RoomKind };
export type AttendanceScope = "all" | "own";

/**
 * Người có scope này được tạo/sửa/xóa phòng này không.
 * - scope "all": mọi phòng.
 * - scope "own": phòng "work" của đúng Ban mình; phòng "shared" chỉ khi mình là người tạo
 *   (khi TẠO phòng mới chưa có createdBy, truyền createdBy = userId để được phép).
 * - "club": chỉ scope "all".
 */
export function canManageRoom(
  scope: AttendanceScope | null | undefined,
  actor: { userId: string; department: string | null | undefined },
  room: { kind: RoomKind; department: string | null; createdBy: string | null },
): boolean {
  if (scope === "all") return true;
  if (scope !== "own") return false;
  if (room.kind === "work") return !!actor.department && room.department === actor.department;
  if (room.kind === "shared") return !!room.createdBy && room.createdBy === actor.userId;
  return false;
}
