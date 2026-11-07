import { describe, expect, it } from "vitest";
import type { MyPermissions } from "./permission-catalog";
import {
  assignablePositions,
  canActOnMember,
  canAdjustMember,
  departmentsFor,
  allowedSections,
  hasAllScope,
  landsOnAdmin,
  onlyPersonalSections,
  withPersonalSections,
} from "./admin-permissions";

const perms = (actions: MyPermissions["actions"], isAdmin = false): MyPermissions => ({
  isAdmin,
  actions,
});

describe("allowedSections", () => {
  it("gives admins every section", () => {
    expect(allowedSections(perms({}, true))).toBe("all");
  });

  it("returns no sections without permissions", () => {
    expect(allowedSections(perms({}))).toEqual([]);
  });

  it("opens sections for a communications member", () => {
    const p = perms({
      "activities.draft": "all",
      "news.write": "all",
      "partners.view": "all",
      "members.view": "own",
    });
    const allowed = allowedSections(p);
    expect(allowed).toContain("members");
    expect(allowed).toContain("activities");
    expect(allowed).toContain("news");
    expect(allowed).toContain("partners");
    expect(allowed).not.toContain("content");
    expect(allowed).not.toContain("photos");
  });

  it("opens academic sections for an academic head but not certificates", () => {
    const allowed = allowedSections(
      perms({
        "courses.manage": "all",
        "teachers.manage": "all",
        "hsk.view": "all",
        "hsk.manage": "all",
      }),
    );
    expect(allowed).toContain("courses");
    expect(allowed).toContain("teachers");
    expect(allowed).toContain("hsk");
    expect(allowed).not.toContain("certificates");
  });

  it("opens hsk from hsk.delete alone", () => {
    expect(allowedSections(perms({ "hsk.delete": "all" }))).toEqual(["hsk"]);
  });

  it("opens courses from enrollments.view alone", () => {
    expect(allowedSections(perms({ "enrollments.view": "all" }))).toEqual(["courses"]);
  });

  it("opens recruitment from questions.edit alone", () => {
    expect(allowedSections(perms({ "questions.edit": "all" }))).toEqual(["recruitment"]);
  });

  it("opens recruitment from recruitment.view alone", () => {
    expect(allowedSections(perms({ "recruitment.view": "all" }))).toEqual(["recruitment"]);
  });

  it("opens candidates from candidates.edit alone", () => {
    expect(allowedSections(perms({ "candidates.edit": "all" }))).toEqual(["candidates"]);
  });

  it("does not open departments from departments.channels", () => {
    expect(allowedSections(perms({ "departments.channels": "own" }))).toEqual([]);
  });

  it("keeps SECTION_ACTIONS key order", () => {
    const allowed = allowedSections(
      perms({ "news.write": "all", "members.view": "own", "content.edit": "all" }),
    );
    expect(allowed).toEqual(["members", "news", "content"]);
  });
});

describe("landsOnAdmin", () => {
  it("sends admins to the admin portal", () => expect(landsOnAdmin("all")).toBe(true));
  it("keeps member-only users on the dashboard", () =>
    expect(landsOnAdmin(["members", "settings"])).toBe(false));
  it("sends users with tasks to admin", () => expect(landsOnAdmin(["tasks"])).toBe(true));
  it("sends users with contributions to admin", () =>
    expect(landsOnAdmin(["contributions"])).toBe(true));
  it("sends users with a module section to admin", () =>
    expect(landsOnAdmin(["members", "news", "settings"])).toBe(true));
  it("keeps users without sections on the dashboard", () => expect(landsOnAdmin([])).toBe(false));
});

describe("withPersonalSections", () => {
  it("keeps full access untouched and gives an empty list the personal sections", () => {
    expect(withPersonalSections("all")).toBe("all");
    expect(withPersonalSections([])).toEqual(["tasks", "contributions", "settings"]);
  });

  it("adds personal sections once, keeping module sections intact without duplicates", () => {
    expect(withPersonalSections(["partners"])).toEqual([
      "partners",
      "tasks",
      "contributions",
      "settings",
    ]);
    expect(withPersonalSections(["tasks", "contributions", "settings"])).toEqual([
      "tasks",
      "contributions",
      "settings",
    ]);
  });
});

describe("onlyPersonalSections", () => {
  it("is true when the user has only personal sections or an empty list", () => {
    expect(onlyPersonalSections(["tasks", "contributions", "settings"])).toBe(true);
    expect(onlyPersonalSections(["contributions"])).toBe(true);
    expect(onlyPersonalSections(["settings"])).toBe(true);
    expect(onlyPersonalSections([])).toBe(true);
  });

  it("is false when the user has module sections or full access", () => {
    expect(onlyPersonalSections(["partners", "tasks", "contributions", "settings"])).toBe(false);
    expect(onlyPersonalSections("all")).toBe(false);
  });
});

describe("hasAllScope", () => {
  it("is true for admins and for scope all", () => {
    expect(hasAllScope(perms({}, true), "points.attendance")).toBe(true);
    expect(hasAllScope(perms({ "points.attendance": "all" }), "points.attendance")).toBe(true);
  });

  it("is false for own scope and for a missing permission", () => {
    expect(hasAllScope(perms({ "points.attendance": "own" }), "points.attendance")).toBe(false);
    expect(hasAllScope(perms({}), "points.attendance")).toBe(false);
  });
});

describe("canAdjustMember", () => {
  const me = (position: string | null, department: string | null = "hr") => ({
    department,
    position,
  });

  it("lets an admin adjust anyone", () => {
    const admin = perms({}, true);
    expect(canAdjustMember(admin, me(null), { department: "comms", position: "Co-founder" })).toBe(
      true,
    );
  });

  it("lets a department head adjust lower positions in the same department only", () => {
    const head = perms({ "points.adjust": "own" });
    expect(
      canAdjustMember(head, me("Trưởng Ban"), { department: "hr", position: "Thành viên" }),
    ).toBe(true);
    expect(canAdjustMember(head, me("Trưởng Ban"), { department: "hr", position: "Phó Ban" })).toBe(
      true,
    );
    expect(
      canAdjustMember(head, me("Trưởng Ban"), { department: "hr", position: "Trưởng Ban" }),
    ).toBe(false);
    expect(
      canAdjustMember(head, me("Trưởng Ban"), { department: "comms", position: "Thành viên" }),
    ).toBe(false);
  });

  it("treats a null target position as Thành viên", () => {
    const head = perms({ "points.adjust": "own" });
    expect(canAdjustMember(head, me("Trưởng Ban"), { department: "hr", position: null })).toBe(
      true,
    );
  });

  it("keeps a deputy head below the head of the same department", () => {
    const deputy = perms({ "points.adjust": "own" });
    expect(
      canAdjustMember(deputy, me("Phó Ban"), { department: "hr", position: "Thành viên" }),
    ).toBe(true);
    expect(
      canAdjustMember(deputy, me("Phó Ban"), { department: "hr", position: "Trưởng Ban" }),
    ).toBe(false);
  });

  it("lets an all-scope co-founder adjust a lower head but not another co-founder", () => {
    const cofounder = perms({ "points.adjust": "all" });
    expect(
      canAdjustMember(cofounder, me("Co-founder", "executive"), {
        department: "comms",
        position: "Trưởng Ban",
      }),
    ).toBe(true);
    expect(
      canAdjustMember(cofounder, me("Co-founder", "executive"), {
        department: "executive",
        position: "Co-founder",
      }),
    ).toBe(false);
  });

  it("refuses without points.adjust", () => {
    expect(
      canAdjustMember(perms({}), me("Trưởng Ban"), { department: "hr", position: "Thành viên" }),
    ).toBe(false);
  });
});

describe("canActOnMember", () => {
  const hrHead = { department: "hr", position: "Trưởng Ban" };
  const target = (position: string, isAdmin = false) => ({ department: "hr", position, isAdmin });

  it("lets an admin act on anyone, including another admin", () => {
    expect(
      canActOnMember(perms({}, true), "members.edit", hrHead, target("Co-founder", true)),
    ).toBe(true);
  });

  it("blocks a non-admin from acting on an admin", () => {
    expect(
      canActOnMember(perms({ "members.edit": "all" }), "members.edit", hrHead, {
        department: "hr",
        position: "Thành viên",
        isAdmin: true,
      }),
    ).toBe(false);
  });

  it("scopes an own permission to the same department and strictly lower positions", () => {
    const p = perms({ "members.edit": "own" });
    expect(canActOnMember(p, "members.edit", hrHead, target("Thành viên"))).toBe(true);
    expect(
      canActOnMember(p, "members.edit", hrHead, { department: "comms", position: "Thành viên" }),
    ).toBe(false);
    expect(canActOnMember(p, "members.edit", hrHead, target("Trưởng Ban"))).toBe(false);
  });

  it("lets the all scope cross departments but still requires a lower position", () => {
    const p = perms({ "members.edit": "all" });
    expect(
      canActOnMember(p, "members.edit", hrHead, { department: "comms", position: "Thành viên" }),
    ).toBe(true);
    expect(
      canActOnMember(p, "members.edit", hrHead, { department: "comms", position: "Trưởng Ban" }),
    ).toBe(false);
  });

  it("refuses without the permission", () => {
    expect(canActOnMember(perms({}), "members.edit", hrHead, target("Thành viên"))).toBe(false);
  });
});

describe("departmentsFor", () => {
  const all = ["hr", "comms", "executive"];
  const me = { department: "hr", position: "Trưởng Ban" };

  it("returns the caller's own department for an own scope", () => {
    expect(departmentsFor(perms({ "members.edit": "own" }), "members.edit", me, all)).toEqual([
      "hr",
    ]);
  });

  it("returns every department (in order) for an all scope", () => {
    expect(departmentsFor(perms({ "members.edit": "all" }), "members.edit", me, all)).toEqual(all);
  });

  it("returns nothing without the permission and everything for an admin", () => {
    expect(departmentsFor(perms({}), "members.edit", me, all)).toEqual([]);
    expect(departmentsFor(perms({}, true), "members.edit", me, all)).toEqual(all);
  });
});

describe("assignablePositions", () => {
  const positions = ["Trưởng Ban", "Phó Ban", "Thành viên", "Cố vấn chuyên môn"];
  const me = (position: string) => ({ department: "hr", position });

  it("keeps only strictly lower positions, in input order", () => {
    expect(assignablePositions(perms({}), me("Trưởng Ban"), positions)).toEqual([
      "Phó Ban",
      "Thành viên",
      "Cố vấn chuyên môn",
    ]);
    expect(assignablePositions(perms({}), me("Phó Ban"), positions)).toEqual([
      "Thành viên",
      "Cố vấn chuyên môn",
    ]);
    expect(assignablePositions(perms({}), me("Thành viên"), positions)).toEqual([]);
  });

  it("gives an admin every position", () => {
    expect(assignablePositions(perms({}, true), me("Thành viên"), positions)).toEqual(positions);
  });
});
