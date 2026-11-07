import { describe, expect, it } from "vitest";
import { getMemberCardTone, TIERS, tierOf } from "./points";

it("tier thresholds 0/51/101/151/201/351/401", () => {
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
  for (const [p, l] of cases) expect(tierOf(p).label).toBe(l);
});

it("tiers follow the real stored points, founders included", () => {
  expect(tierOf(0).key).toBe("bronze");
  expect(tierOf(400).key).toBe("platinum");
});

describe("getMemberCardTone", () => {
  it("leaders keep the obsidian card", () => {
    expect(getMemberCardTone(true, "green")).toBe("black");
  });
  it("everyone else shows their tier tone", () => {
    expect(getMemberCardTone(false, "purple")).toBe("purple");
  });
});

describe("tier palette", () => {
  it("maps each tier to its new colour", () => {
    const palette = Object.fromEntries(TIERS.map((t) => [t.key, [t.className, t.tone]]));
    expect(palette).toEqual({
      honor: ["tier-wine", "wine"],
      platinum: ["tier-carnelian", "carnelian"],
      excellent: ["tier-pink", "pink"],
      gold: ["tier-purple", "purple"],
      silver: ["tier-blue", "blue"],
      official: ["tier-green", "green"],
      bronze: ["tier-bronze", "bronze"],
    });
  });
});
