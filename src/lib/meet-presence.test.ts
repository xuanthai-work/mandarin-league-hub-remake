import { describe, expect, it } from "vitest";
import { isPresenceFresh, presenceLabel, type RoomPresence } from "./meet-presence";

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
