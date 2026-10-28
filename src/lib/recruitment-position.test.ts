import { describe, expect, it } from "vitest";
import { defaultPosition } from "./recruitment";

describe("defaultPosition", () => {
  it("defaults to Thành viên, never Trưởng Ban", () => expect(defaultPosition("podcast")).toBe("Thành viên"));
  it("keeps the applicant's valid choice", () => expect(defaultPosition("podcast", "Phó Ban")).toBe("Phó Ban"));
  it("falls back when choice invalid for dept", () => expect(defaultPosition("executive", "Trưởng Ban")).toBe("Thư ký"));
});
