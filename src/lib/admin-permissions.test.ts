import { describe, expect, it } from "vitest";
import type { MyPermissions } from "./permission-catalog";
import {
  allowedSections,
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
  it("sends users with a module section to admin", () =>
    expect(landsOnAdmin(["members", "news", "settings"])).toBe(true));
  it("keeps users without sections on the dashboard", () => expect(landsOnAdmin([])).toBe(false));
});

describe("withPersonalSections", () => {
  it("keeps full access untouched and gives an empty list the personal settings", () => {
    expect(withPersonalSections("all")).toBe("all");
    expect(withPersonalSections([])).toEqual(["settings"]);
  });

  it("adds settings once, keeping module sections intact", () => {
    expect(withPersonalSections(["partners"])).toEqual(["partners", "settings"]);
    expect(withPersonalSections(["partners", "settings"])).toEqual(["partners", "settings"]);
  });
});

describe("onlyPersonalSections", () => {
  it("is true when the user has only personal sections or an empty list", () => {
    expect(onlyPersonalSections(["settings"])).toBe(true);
    expect(onlyPersonalSections([])).toBe(true);
  });

  it("is false when the user has module sections or full access", () => {
    expect(onlyPersonalSections(["partners", "settings"])).toBe(false);
    expect(onlyPersonalSections("all")).toBe(false);
  });
});
