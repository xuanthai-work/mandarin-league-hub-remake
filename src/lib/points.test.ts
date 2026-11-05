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

import { isLeader as isLeader2 } from "./points";
import { test as t2, expect as e2 } from "vitest";
t2("professional advisors are left off the leaderboard", () => {
  e2(isLeader2({ department: "media", position: "Thành viên" }, [], true)).toBe(true);
  e2(isLeader2({ department: "media", position: "Thành viên" }, [], false)).toBe(false);
});

import { tierOf } from "./points";
t2("tier thresholds 0/100/300/600/1000/1600/2200", () => {
  const cases: [number, string][] = [
    [0, "Tập sự"],
    [99, "Tập sự"],
    [100, "Chính thức"],
    [299, "Chính thức"],
    [300, "Tích cực"],
    [600, "Nòng cốt"],
    [999, "Nòng cốt"],
    [1000, "Xuất sắc"],
    [1599, "Xuất sắc"],
    [1600, "Ưu tú"],
    [2199, "Ưu tú"],
    [2200, "Danh dự"],
  ];
  for (const [p, l] of cases) e2(tierOf(p).label).toBe(l);
});
