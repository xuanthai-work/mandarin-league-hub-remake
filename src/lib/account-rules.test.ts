import { describe, expect, it } from "vitest";
import { currentAccessOf, legacyAccessChangeError, type AccessLevel } from "./account-rules";

describe("currentAccessOf", () => {
  it("defaults to member", () => expect(currentAccessOf([])).toBe("member"));
  it("prefers admin", () => expect(currentAccessOf(["member", "admin"])).toBe("admin"));
  it("keeps deputy_head", () => expect(currentAccessOf(["deputy_head"])).toBe("deputy_head"));
  it("prefers department_head over deputy_head", () =>
    expect(currentAccessOf(["department_head", "deputy_head"])).toBe("department_head"));
});

describe("legacyAccessChangeError", () => {
  const current = { access: "member" as AccessLevel, permissions: ["members.view"] };

  it("lets admins change anything", () => {
    expect(
      legacyAccessChangeError(true, current, { access: "department_head", permissions: [] }),
    ).toBeNull();
    expect(
      legacyAccessChangeError(true, null, { access: "admin", permissions: ["members.edit"] }),
    ).toBeNull();
  });

  it("lets non-admins create only plain members", () => {
    expect(legacyAccessChangeError(false, null, { access: "member", permissions: [] })).toBeNull();
    expect(
      legacyAccessChangeError(false, null, { access: "department_head", permissions: [] }),
    ).toBe("Chỉ Quản trị viên được cấp vai trò hệ thống khác Thành viên.");
  });

  it("lets non-admins resend the same access and permissions", () => {
    const same = { access: "member" as AccessLevel, permissions: ["members.view", "points.view"] };
    expect(
      legacyAccessChangeError(false, same, {
        access: "member",
        permissions: ["points.view", "members.view"],
      }),
    ).toBeNull();
  });

  it("blocks non-admins from changing the access", () => {
    expect(
      legacyAccessChangeError(false, current, {
        access: "deputy_head",
        permissions: ["members.view"],
      }),
    ).toBe("Chỉ Quản trị viên được đổi vai trò hệ thống.");
  });

  it("blocks non-admins from adding permissions", () => {
    expect(
      legacyAccessChangeError(false, current, {
        access: "member",
        permissions: ["members.view", "members.edit"],
      }),
    ).toBe("Chỉ Quản trị viên được đổi quyền chi tiết cũ.");
  });
});
