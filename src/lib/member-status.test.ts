import { describe, expect, it } from "vitest";
import { leaveDaysLeft } from "./member-status";

describe("leaveDaysLeft", () => {
  const today = new Date(2026, 9, 20);
  it("counts days until return", () => expect(leaveDaysLeft("2026-11-01", today)).toBe(12));
  it("is negative when overdue", () => expect(leaveDaysLeft("2026-10-18", today)).toBe(-2));
  it("is null without a date", () => expect(leaveDaysLeft(null, today)).toBeNull());
});
