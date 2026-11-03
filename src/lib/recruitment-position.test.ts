import { describe, expect, it } from "vitest";
import {
  defaultPosition,
  formatTopicPositions,
  parseTopicPositions,
  topicApplies,
} from "./recruitment";

describe("defaultPosition", () => {
  it("defaults to Thành viên, never Trưởng Ban", () =>
    expect(defaultPosition("podcast")).toBe("Thành viên"));
  it("keeps the applicant's valid choice", () =>
    expect(defaultPosition("podcast", "Phó Ban")).toBe("Phó Ban"));
  it("falls back when choice invalid for dept", () =>
    expect(defaultPosition("executive", "Trưởng Ban")).toBe("Thư ký"));
});

describe("parseTopicPositions", () => {
  it("splits, trims and drops empty entries", () => {
    expect(parseTopicPositions("Thành viên, Phó Ban")).toEqual(["Thành viên", "Phó Ban"]);
    expect(parseTopicPositions("  Biên tập viên ,, Trưởng nhóm ")).toEqual([
      "Biên tập viên",
      "Trưởng nhóm",
    ]);
  });

  it("treats null/blank as every position", () => {
    expect(parseTopicPositions(null)).toEqual([]);
    expect(parseTopicPositions(undefined)).toEqual([]);
    expect(parseTopicPositions("   ")).toEqual([]);
  });
});

describe("formatTopicPositions", () => {
  it("dedupes, trims and joins", () => {
    expect(formatTopicPositions([" Phó Ban ", "Phó Ban", "Thành viên"])).toBe(
      "Phó Ban, Thành viên",
    );
  });

  it("returns null when there is nothing to store", () => {
    expect(formatTopicPositions([])).toBeNull();
    expect(formatTopicPositions(["", "  "])).toBeNull();
  });

  it("round-trips through parse", () => {
    const raw = formatTopicPositions(["Thành viên", "Phó Ban"]);
    expect(parseTopicPositions(raw)).toEqual(["Thành viên", "Phó Ban"]);
  });
});

describe("topicApplies", () => {
  const t = (position: string | null, department: string | null = "comms") => ({
    department,
    position,
  });

  it("applies when the topic targets every position", () => {
    expect(topicApplies(t(null), { department: "comms", position: "Thành viên" })).toBe(true);
  });

  it("applies when the applicant position is in the list", () => {
    expect(
      topicApplies(t("Thành viên, Phó Ban"), { department: "comms", position: "Phó Ban" }),
    ).toBe(true);
  });

  it("skips positions outside the list", () => {
    expect(
      topicApplies(t("Biên tập viên, Trưởng nhóm"), { department: "comms", position: "Phó Ban" }),
    ).toBe(false);
  });

  it("never matches another department", () => {
    expect(topicApplies(t(null, "hr"), { department: "comms", position: "Thành viên" })).toBe(
      false,
    );
  });
});
