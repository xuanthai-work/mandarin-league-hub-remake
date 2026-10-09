import { describe, expect, it } from "vitest";
import { isLeader } from "./points";

describe("leaderboard exclusion", () => {
  it("excludes heads and deputies", () => {
    expect(isLeader({ department: "hr", position: "Trưởng Ban" })).toBe(true);
    expect(isLeader({ department: "hr", position: "Phó Ban" })).toBe(true);
  });
  it("excludes Executive Board and admins", () => {
    expect(isLeader({ department: "executive", position: "Thư ký" })).toBe(true);
    expect(isLeader({ department: "hr", position: "Thành viên" }, ["admin"])).toBe(true);
  });
  it("keeps ordinary members", () => {
    expect(isLeader({ department: "hr", position: "Thành viên" }, ["member"])).toBe(false);
  });
});
