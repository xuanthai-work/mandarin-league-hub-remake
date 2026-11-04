import { describe, expect, it } from "vitest";
import { isDefaultPosition, removePositionFromTopicString } from "./recruitment";

describe("isDefaultPosition", () => {
  it("recognises the fixed positions of a department", () => {
    expect(isDefaultPosition("design", "Thành viên")).toBe(true);
    expect(isDefaultPosition("design", "Phó Ban")).toBe(true);
    expect(isDefaultPosition("design", "Trưởng Ban")).toBe(true);
    expect(isDefaultPosition("design", "Cố vấn chuyên môn")).toBe(true);
    expect(isDefaultPosition("executive", "Thư ký")).toBe(true);
    expect(isDefaultPosition("executive", "Co-founder")).toBe(true);
  });

  it("treats ad-hoc titles as custom positions", () => {
    expect(isDefaultPosition("design", "Tester")).toBe(false);
    expect(isDefaultPosition("design", "Designer")).toBe(false);
    expect(isDefaultPosition("executive", "Thành viên")).toBe(false);
    expect(isDefaultPosition(null, "Trưởng nhóm Frontend")).toBe(false);
    expect(isDefaultPosition(undefined, "Trưởng Ban")).toBe(true);
  });
});

describe("removePositionFromTopicString", () => {
  it("drops one position and keeps the rest in order", () => {
    expect(removePositionFromTopicString("Trưởng Ban, Tester, Thành viên", "Tester")).toBe(
      "Trưởng Ban, Thành viên",
    );
    expect(removePositionFromTopicString("Tester, Designer", "Tester")).toBe("Designer");
  });

  it("keeps the value untouched when the position is not there", () => {
    expect(removePositionFromTopicString("Thành viên, Phó Ban", "Tester")).toBe(
      "Thành viên, Phó Ban",
    );
  });

  it("returns null when nothing is left", () => {
    expect(removePositionFromTopicString("Tester", "Tester")).toBeNull();
    expect(removePositionFromTopicString("", "Tester")).toBeNull();
    expect(removePositionFromTopicString(null, "Tester")).toBeNull();
    expect(removePositionFromTopicString(undefined, "Tester")).toBeNull();
  });
});
