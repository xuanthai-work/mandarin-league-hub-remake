import { describe, expect, it } from "vitest";
import type { AdminRole } from "./admin-nav";
import {
  allowedSections,
  canManagePartners,
  canReviewNews,
  canViewPartners,
  onlyPersonalSections,
  withPersonalSections,
} from "./admin-permissions";

describe("admin permissions", () => {
  it("comms member sees news, activities, partners only", () => {
    expect(allowedSections(["member"], "comms")).toEqual(["news", "activities", "partners"]);
  });
  it("only comms heads (not members) get page content", () => {
    expect(allowedSections(["deputy_head"], "comms")).toContain("content");
    expect(allowedSections(["member"], "comms")).not.toContain("content");
  });
  it("finance member sees partners only", () => {
    expect(allowedSections(["member"], "finance")).toEqual(["partners"]);
  });
  it("departments without partner access get no admin sections", () => {
    expect(allowedSections(["member"], "hr")).toEqual([]);
    expect(allowedSections(["member"], "academic")).toEqual([]);
  });
  it("members.edit opens the members section on its own, members.view does not", () => {
    expect(allowedSections(["member"], "academic", ["members.edit"])).toEqual(["members"]);
    expect(allowedSections(["member"], "academic", ["members.view"])).toEqual([]);
    expect(allowedSections(["member"], "finance", ["members.edit"])).toEqual([
      "members",
      "partners",
    ]);
  });
  it("only comms heads/deputies and admin can publish news", () => {
    expect(canReviewNews(["member"], "comms")).toBe(false);
    expect(canReviewNews(["deputy_head"], "comms")).toBe(true);
    expect(canReviewNews(["department_head"], "hr")).toBe(false);
    expect(canReviewNews(["admin"], null)).toBe(true);
  });
  it("only admin manages partners, finance and comms only view", () => {
    expect(canManagePartners(["admin"], null)).toBe(true);
    expect(canManagePartners(["member"], "finance")).toBe(false);
    expect(canViewPartners(["member"], "finance")).toBe(true);
    expect(canManagePartners(["department_head"], "comms")).toBe(false);
  });
});

/** Create / edit / hide-show / delete all share one server-enforced write capability. */
const partnerCapabilities = (roles: AdminRole[], department: string | null) => {
  const write = canManagePartners(roles, department);
  return {
    view: canViewPartners(roles, department),
    create: write,
    edit: write,
    toggle: write,
    delete: write,
  };
};

describe("partners access matrix", () => {
  const matrix: Array<{
    user: string;
    roles: AdminRole[];
    department: string | null;
    view: boolean;
    write: boolean;
  }> = [
    { user: "admin", roles: ["admin"], department: null, view: true, write: true },
    { user: "finance member", roles: ["member"], department: "finance", view: true, write: false },
    { user: "hr member", roles: ["member"], department: "hr", view: false, write: false },
    {
      user: "academic member",
      roles: ["member"],
      department: "academic",
      view: false,
      write: false,
    },
    { user: "media member", roles: ["member"], department: "comms", view: true, write: false },
    { user: "design member", roles: ["member"], department: "design", view: true, write: false },
    {
      user: "translation member",
      roles: ["member"],
      department: "translation",
      view: true,
      write: false,
    },
    {
      user: "podcast member",
      roles: ["member"],
      department: "postcard",
      view: false,
      write: false,
    },
    { user: "unauthorized user", roles: ["member"], department: null, view: false, write: false },
    { user: "signed-in with no roles", roles: [], department: null, view: false, write: false },
  ];

  for (const row of matrix) {
    it(`${row.user}: view=${row.view}, create/edit/toggle/delete=${row.write}`, () => {
      expect(partnerCapabilities(row.roles, row.department)).toEqual({
        view: row.view,
        create: row.write,
        edit: row.write,
        toggle: row.write,
        delete: row.write,
      });
      // The admin layout and sidebar both use this list, so direct /admin/partners visits are gated too.
      const allowed = allowedSections(row.roles, row.department);
      expect(allowed === "all" || allowed.includes("partners")).toBe(row.view);
    });
  }

  it("admin keeps full CRUD in every department", () => {
    for (const department of ["comms", "design", "finance", "hr", "academic", null]) {
      expect(canManagePartners(["admin"], department)).toBe(true);
    }
  });

  it("only approved departments may view without write access", () => {
    for (const roles of [["department_head"], ["deputy_head"]] as AdminRole[][]) {
      expect(canViewPartners(roles, "hr")).toBe(false);
      expect(canViewPartners(roles, "academic")).toBe(false);
      expect(canManagePartners(roles, "hr")).toBe(false);
    }
    expect(canViewPartners(["member"], "finance")).toBe(true);
    expect(canViewPartners(["member"], "design")).toBe(true);
    expect(canViewPartners(["member"], "comms")).toBe(true);
    expect(canViewPartners(["member"], "translation")).toBe(true);
    expect(canViewPartners(["member"], "tech")).toBe(false);
    expect(canViewPartners(["member"], "postcard")).toBe(false);
    expect(canManagePartners(["member"], "tech")).toBe(false);
    // A head role without an approved department cannot read partners.
    expect(canViewPartners(["department_head"], null)).toBe(false);
  });

  it("supports multiple roles without granting write access", () => {
    expect(canManagePartners(["member", "deputy_head"], "design")).toBe(false);
    expect(canViewPartners(["member", "deputy_head"], "design")).toBe(true);
  });
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
