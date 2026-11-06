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
t2("tier thresholds 0/51/101/151/201/351/401", () => {
  const cases: [number, string][] = [
    [0, "Tập sự"],
    [50, "Tập sự"],
    [51, "Chính thức"],
    [100, "Chính thức"],
    [101, "Tích cực"],
    [150, "Tích cực"],
    [151, "Nòng cốt"],
    [200, "Nòng cốt"],
    [201, "Xuất sắc"],
    [350, "Xuất sắc"],
    [351, "Ưu tú"],
    [400, "Ưu tú"],
    [401, "Danh dự"],
    [450, "Danh dự"],
  ];
  for (const [p, l] of cases) e2(tierOf(p).label).toBe(l);
});
