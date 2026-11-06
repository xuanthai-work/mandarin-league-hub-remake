import { describe, expect, it } from "vitest";
import { accessLabel } from "./admin-nav";

describe("accessLabel", () => {
  it("shows the admin flag first", () => {
    expect(accessLabel(true, "Thành viên")).toBe("Quản trị viên");
  });

  it("shows the real position otherwise", () => {
    expect(accessLabel(false, "Trưởng Ban")).toBe("Trưởng Ban");
  });

  it("falls back to Thành viên for a blank or missing position", () => {
    expect(accessLabel(false, "  ")).toBe("Thành viên");
    expect(accessLabel(false, null)).toBe("Thành viên");
  });
});
