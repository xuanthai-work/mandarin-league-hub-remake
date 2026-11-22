import { describe, expect, it } from "vitest";
import {
  isPresenceFresh,
  presenceLabel,
  sharedRoomWarning,
  type RoomPresence,
} from "./meet-presence";

describe("isPresenceFresh", () => {
  const now = 1700000000000;

  it("returns true when checked within TTL (e.g. 10s ago)", () => {
    const checkedAt = new Date(now - 10_000).toISOString();
    expect(isPresenceFresh(checkedAt, now)).toBe(true);
  });

  it("returns false when exactly at 60s TTL", () => {
    const checkedAt = new Date(now - 60_000).toISOString();
    expect(isPresenceFresh(checkedAt, now)).toBe(false);
  });

  it("returns false when older than 60s", () => {
    const checkedAt = new Date(now - 60_001).toISOString();
    expect(isPresenceFresh(checkedAt, now)).toBe(false);
  });

  it("returns false for invalid input or null/undefined", () => {
    expect(isPresenceFresh(null, now)).toBe(false);
    expect(isPresenceFresh(undefined, now)).toBe(false);
    expect(isPresenceFresh("invalid-date", now)).toBe(false);
  });
});

describe("presenceLabel", () => {
  it("returns 'Chưa rõ' when presence data is undefined", () => {
    expect(presenceLabel(undefined)).toBe("Chưa rõ");
  });

  it("returns 'Trống' when not active", () => {
    expect(presenceLabel({ active: false, count: 0 })).toBe("Trống");
  });

  it("returns 'Trống' when active but participant count is 0", () => {
    expect(presenceLabel({ active: true, count: 0 })).toBe("Trống");
  });

  it("returns 'Đang họp: N người' when active and count > 0", () => {
    expect(presenceLabel({ active: true, count: 5 })).toBe("Đang họp: 5 người");
  });
});

describe("sharedRoomWarning", () => {
  it("returns null when there are no shared rooms", () => {
    const rooms = [
      { id: "1", kind: "work", label: "Ban Công nghệ" },
      { id: "2", kind: "club", label: "Họp toàn thể" },
    ];
    const presence: Record<string, RoomPresence> = {
      "1": { roomId: "1", active: true, count: 4, checkedAt: "" },
      "2": { roomId: "2", active: true, count: 10, checkedAt: "" },
    };
    expect(sharedRoomWarning(rooms, presence)).toBeNull();
  });

  it("returns null when shared rooms are empty or inactive", () => {
    const rooms = [{ id: "s1", kind: "shared", label: "Họp chung 1" }];
    const presence: Record<string, RoomPresence> = {
      s1: { roomId: "s1", active: false, count: 0, checkedAt: "" },
    };
    expect(sharedRoomWarning(rooms, presence)).toBeNull();
  });

  it("warns when one shared room is active with participants", () => {
    const rooms = [
      { id: "s1", kind: "shared", label: "Họp chung 1" },
      { id: "w1", kind: "work", label: "Ban Công nghệ" },
    ];
    const presence: Record<string, RoomPresence> = {
      s1: { roomId: "s1", active: true, count: 3, checkedAt: "" },
      w1: { roomId: "w1", active: true, count: 5, checkedAt: "" },
    };
    expect(sharedRoomWarning(rooms, presence)).toBe(
      "Phòng chung đang có người họp: Họp chung 1 (3 người). Hãy chọn phòng chung khác.",
    );
  });

  it("lists all busy shared rooms when multiple shared rooms have participants", () => {
    const rooms = [
      { id: "s1", kind: "shared", label: "Họp chung 1" },
      { id: "s2", kind: "shared", label: "Họp chung 2" },
      { id: "s3", kind: "shared", label: "Họp chung 3" },
    ];
    const presence: Record<string, RoomPresence> = {
      s1: { roomId: "s1", active: true, count: 3, checkedAt: "" },
      s2: { roomId: "s2", active: true, count: 1, checkedAt: "" },
      s3: { roomId: "s3", active: false, count: 0, checkedAt: "" },
    };
    expect(sharedRoomWarning(rooms, presence)).toBe(
      "Phòng chung đang có người họp: Họp chung 1 (3 người), Họp chung 2 (1 người). Hãy chọn phòng chung khác.",
    );
  });

  it("works with Map as well as plain object", () => {
    const rooms = [{ id: "s1", kind: "shared", label: "Họp chung 1" }];
    const presenceMap = new Map<string, RoomPresence>([
      ["s1", { roomId: "s1", active: true, count: 2, checkedAt: "" }],
    ]);
    expect(sharedRoomWarning(rooms, presenceMap)).toBe(
      "Phòng chung đang có người họp: Họp chung 1 (2 người). Hãy chọn phòng chung khác.",
    );
  });
});
