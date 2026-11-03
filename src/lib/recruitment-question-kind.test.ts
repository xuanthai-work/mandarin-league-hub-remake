import { describe, expect, it } from "vitest";
import { QUESTION_BANK, QUESTION_KINDS, canonicalKind } from "./recruitment";

describe("canonicalKind", () => {
  it("keeps the four supported kinds", () => {
    expect(canonicalKind("long")).toBe("long");
    expect(canonicalKind("single")).toBe("single");
    expect(canonicalKind("multi")).toBe("multi");
    expect(canonicalKind("file")).toBe("file");
  });

  it("folds legacy kinds into their replacement", () => {
    expect(canonicalKind("short")).toBe("long");
    expect(canonicalKind("dropdown")).toBe("single");
  });

  it("falls back to a paragraph for unknown kinds", () => {
    expect(canonicalKind("mystery")).toBe("long");
    expect(canonicalKind("")).toBe("long");
  });
});

describe("QUESTION_KINDS", () => {
  it("offers exactly the four simplified kinds", () => {
    expect(Object.keys(QUESTION_KINDS)).toEqual(["long", "single", "multi", "file"]);
    expect(QUESTION_KINDS["long"]).toBe("Đoạn văn");
    expect(QUESTION_KINDS["single"]).toBe("Một lựa chọn");
    expect(QUESTION_KINDS["multi"]).toBe("Nhiều lựa chọn");
    expect(QUESTION_KINDS["file"]).toBe("Tải tệp");
  });
});

describe("QUESTION_BANK", () => {
  it("only seeds kinds the studio can display", () => {
    const kinds = QUESTION_BANK.flatMap((entry) =>
      entry.topics.flatMap((topic) => topic.questions.map((q) => q.kind ?? "long")),
    );
    expect(kinds.length).toBeGreaterThan(0);
    expect(kinds.every((k) => Object.hasOwn(QUESTION_KINDS, k))).toBe(true);
    expect(kinds).not.toContain("short");
    expect(kinds).not.toContain("dropdown");
  });
});
