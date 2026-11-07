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
  it("uses the real position, not the legacy head roles", () => {
    expect(isLeader({ department: "hr", position: "Thành viên" }, ["department_head"])).toBe(false);
    expect(isLeader({ department: "hr", position: "Thành viên" }, ["admin"])).toBe(true);
  });
});

import { isLeader as isLeader2 } from "./points";
import { test as t2, expect as e2 } from "vitest";
t2("professional advisors are left off the leaderboard", () => {
  e2(isLeader2({ department: "media", position: "Thành viên" }, [], true)).toBe(true);
  e2(isLeader2({ department: "media", position: "Thành viên" }, [], false)).toBe(false);
});

import { getMemberCardTone, isFounder, TIERS, tierOf } from "./points";

describe("isFounder", () => {
  it("recognises co-founders and founders", () => {
    expect(isFounder("Co-founder")).toBe(true);
    expect(isFounder("co-founder")).toBe(true);
    expect(isFounder("Founder")).toBe(true);
    expect(isFounder("Co-Founder & CEO")).toBe(true);
  });

  it("excludes advisors, heads and ordinary members", () => {
    expect(isFounder("Cố vấn chuyên môn")).toBe(false);
    expect(isFounder("Trưởng Ban")).toBe(false);
    expect(isFounder("Thành viên")).toBe(false);
    expect(isFounder(null)).toBe(false);
  });
});
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

t2("tiers follow the real stored points, founders included", () => {
  e2(tierOf(0).key).toBe("bronze");
  e2(tierOf(400).key).toBe("platinum");
});

describe("getMemberCardTone", () => {
  it("only founders and co-founders keep the obsidian card", () => {
    expect(getMemberCardTone({ position: "Co-founder" }, [], false)).toBe("black");
    expect(getMemberCardTone({ position: "Founder" }, [], false)).toBe("black");
  });

  it("gives heads, advisors and deputies their real tier tone", () => {
    expect(getMemberCardTone({ position: "Trưởng Ban" }, [], false, "sapphire")).toBe("sapphire");
    expect(getMemberCardTone({ position: "Cố vấn chuyên môn" }, [], false, "green")).toBe("green");
    expect(getMemberCardTone({ position: "Thành viên" }, [], true, "purple")).toBe("purple");
    expect(getMemberCardTone({ position: "Phó Ban" }, [], false, "lavender")).toBe("lavender");
  });

  it("assigns tier tone to regular members", () => {
    expect(getMemberCardTone({ position: "Thành viên" }, [], false, "green")).toBe("green");
  });
});

describe("tier palette", () => {
  it("maps each tier to its new colour", () => {
    const palette = Object.fromEntries(TIERS.map((t) => [t.key, [t.className, t.tone]]));
    expect(palette).toEqual({
      honor: ["tier-wine", "wine"],
      platinum: ["tier-lavender", "lavender"],
      excellent: ["tier-purple", "purple"],
      gold: ["tier-sapphire", "sapphire"],
      silver: ["tier-blue", "blue"],
      official: ["tier-green", "green"],
      bronze: ["tier-bronze", "bronze"],
    });
  });
});
