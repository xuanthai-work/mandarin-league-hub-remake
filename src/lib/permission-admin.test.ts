import { describe, expect, it } from "vitest";
import { PERMISSION_ACTIONS } from "./permission-catalog";
import {
  ALL_DEPARTMENTS_KEY,
  MODULE_LABELS,
  ORDINARY_DEPARTMENTS,
  actionGroups,
  actionHolders,
  actionMatches,
  auditSummary,
  cellScope,
  countGranted,
  expiryFromDate,
  grantStatus,
  groupMemberPermissions,
  positionsFor,
  scopeLabel,
  type AuditRow,
  type MatrixRow,
  type MemberPermissionRow,
} from "./permission-admin";

describe("MODULE_LABELS", () => {
  it("covers every module in the catalog", () => {
    for (const action of PERMISSION_ACTIONS) {
      expect(MODULE_LABELS[action.module], action.module).toBeTruthy();
    }
  });
});

describe("actionGroups", () => {
  it("keeps every action and starts with recruitment", () => {
    const groups = actionGroups();
    const total = groups.reduce((n, g) => n + g.actions.length, 0);
    expect(total).toBe(PERMISSION_ACTIONS.length);
    expect(total).toBe(38);
    expect(groups[0]?.module).toBe("recruitment");
  });
});

describe("positionsFor", () => {
  it("gives the executive board two columns and every other tab four", () => {
    expect(positionsFor("executive")).toHaveLength(2);
    expect(positionsFor("hr")).toHaveLength(4);
    expect(positionsFor(ALL_DEPARTMENTS_KEY)).toHaveLength(4);
  });
});

describe("cellScope", () => {
  const rows: MatrixRow[] = [
    { department: "hr", position: "Trưởng Ban", action: "members.view", scope: "own" },
    { department: "comms", position: "Phó Ban", action: "members.view", scope: "all" },
  ];

  it("reads the row of the exact cell", () => {
    expect(cellScope(rows, "hr", "Trưởng Ban", "members.view")).toBe("own");
  });

  it("returns null when the cell has no row", () => {
    expect(cellScope(rows, "hr", "Thành viên", "members.view")).toBeNull();
  });

  it("does not pick a row of another department or position", () => {
    expect(cellScope(rows, "comms", "Trưởng Ban", "members.view")).toBeNull();
    expect(cellScope(rows, "hr", "Phó Ban", "members.view")).toBeNull();
  });
});

describe("countGranted", () => {
  const rows: MatrixRow[] = [
    { department: "hr", position: "Trưởng Ban", action: "members.view", scope: "own" },
    { department: "hr", position: "Trưởng Ban", action: "members.edit", scope: "all" },
    { department: "hr", position: "Phó Ban", action: "members.view", scope: "own" },
    { department: "comms", position: "Trưởng Ban", action: "members.view", scope: "own" },
  ];

  it("counts only the requested department and position", () => {
    expect(countGranted(rows, "hr", "Trưởng Ban")).toBe(2);
    expect(countGranted(rows, "hr", "Phó Ban")).toBe(1);
    expect(countGranted(rows, "hr", "Thành viên")).toBe(0);
  });
});

describe("actionMatches", () => {
  const recruitment = PERMISSION_ACTIONS.find((a) => a.module === "recruitment")!;
  const candidatesView = PERMISSION_ACTIONS.find((a) => a.code === "candidates.view")!;

  it("matches by module name without Vietnamese tones", () => {
    expect(actionMatches(recruitment, "tuyen dung")).toBe(true);
  });

  it("matches by action code", () => {
    expect(actionMatches(candidatesView, "candidates.view")).toBe(true);
  });

  it("matches everything on an empty keyword and nothing on an unknown one", () => {
    expect(actionMatches(candidatesView, "")).toBe(true);
    expect(actionMatches(candidatesView, "khong ton tai xyz")).toBe(false);
  });
});

describe("ORDINARY_DEPARTMENTS", () => {
  it("is the 8 departments other than the executive board", () => {
    expect(ORDINARY_DEPARTMENTS).toHaveLength(8);
    expect(ORDINARY_DEPARTMENTS).not.toContain("executive");
  });
});

describe("actionHolders", () => {
  const ownAll = (departments: readonly string[], scope: "own" | "all" = "own"): MatrixRow[] =>
    departments.map((department) => ({
      department,
      position: "Trưởng Ban",
      action: "members.view",
      scope,
    }));

  it("collapses a position granted in all 8 departments with the same scope", () => {
    expect(actionHolders(ownAll(ORDINARY_DEPARTMENTS), "members.view")).toEqual([
      { label: "Trưởng Ban · mọi ban", scope: "own" },
    ]);
  });

  it("lists each department when only 7 have the permission", () => {
    const holders = actionHolders(ownAll(ORDINARY_DEPARTMENTS.slice(0, 7)), "members.view");
    expect(holders).toHaveLength(7);
    expect(holders.every((h) => h.label.startsWith("Trưởng Ban · "))).toBe(true);
  });

  it("lists each department when the scopes differ", () => {
    const rows = [
      ...ownAll(ORDINARY_DEPARTMENTS.slice(0, 7), "own"),
      ...ownAll(ORDINARY_DEPARTMENTS.slice(7), "all"),
    ];
    expect(actionHolders(rows, "members.view")).toHaveLength(8);
  });

  it("names the executive board seat explicitly", () => {
    const rows: MatrixRow[] = [
      { department: "executive", position: "Co-founder", action: "members.view", scope: "all" },
    ];
    expect(actionHolders(rows, "members.view")).toEqual([
      { label: "Co-founder · Ban Điều hành", scope: "all" },
    ]);
  });

  it("returns nothing when no one holds the action", () => {
    expect(actionHolders([], "members.view")).toEqual([]);
  });
});

describe("scopeLabel", () => {
  it("names each scope", () => {
    expect(scopeLabel(null, true)).toBe("Không");
    expect(scopeLabel("own", true)).toBe("Ban mình");
    expect(scopeLabel("all", true)).toBe("Toàn tổ chức");
    expect(scopeLabel("all", false)).toBe("Có");
  });
});

describe("grantStatus", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("marks revoked, expired and still-active grants", () => {
    expect(grantStatus({ revoked_at: "2026-01-01", expires_at: null }, now)).toBe("revoked");
    expect(grantStatus({ revoked_at: null, expires_at: "2026-05-31T23:59:59+07:00" }, now)).toBe(
      "expired",
    );
    expect(grantStatus({ revoked_at: null, expires_at: "2026-12-31T23:59:59+07:00" }, now)).toBe(
      "active",
    );
    expect(grantStatus({ revoked_at: null, expires_at: null }, now)).toBe("active");
  });
});

describe("expiryFromDate", () => {
  it("expires at the end of the picked day and treats empty as no expiry", () => {
    expect(expiryFromDate("2026-12-31")).toBe("2026-12-31T23:59:59+07:00");
    expect(expiryFromDate("")).toBeNull();
  });
});

describe("auditSummary", () => {
  const base: AuditRow = {
    kind: "matrix_set",
    department: "hr",
    position: "Trưởng Ban",
    action: "members.view",
    scope_before: null,
    scope_after: "own",
    expires_at: null,
  };

  it("describes adding and changing a matrix cell", () => {
    expect(auditSummary(base, "Ngọc")).toContain("thêm");
    expect(auditSummary({ ...base, scope_before: "own", scope_after: "all" }, "Ngọc")).toContain(
      "từ Ban mình thành Toàn tổ chức",
    );
  });

  it("describes unsetting a matrix cell", () => {
    expect(auditSummary({ ...base, kind: "matrix_unset" }, "Ngọc")).toContain("bỏ");
  });

  it("describes grants with and without an expiry", () => {
    const grant: AuditRow = { ...base, kind: "grant" };
    expect(auditSummary(grant, "Ngọc")).toContain("Ngọc");
    expect(auditSummary(grant, "Ngọc")).toContain("không thời hạn");
    expect(auditSummary({ ...grant, expires_at: "2026-12-31T23:59:59+07:00" }, "Ngọc")).toContain(
      "đến hết 31/12/2026",
    );
  });

  it("describes a revoke with the member name", () => {
    expect(auditSummary({ ...base, kind: "revoke" }, "Ngọc")).toContain("Thu hồi");
    expect(auditSummary({ ...base, kind: "revoke" }, "Ngọc")).toContain("Ngọc");
  });
});

describe("groupMemberPermissions", () => {
  const row = (
    action: string,
    source: "matrix" | "grant",
    overrides: Partial<MemberPermissionRow> = {},
  ): MemberPermissionRow => ({
    action,
    scope: "own",
    source,
    grant_id: source === "grant" ? `grant-${action}` : null,
    expires_at: null,
    note: "",
    granted_by_label: "",
    ...overrides,
  });

  it("keeps only the requested source", () => {
    const rows = [row("members.view", "matrix"), row("members.edit", "grant")];
    const groups = groupMemberPermissions(rows, "matrix");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((i) => i.meta.code)).toEqual(["members.view"]);
  });

  it("orders groups like the catalog", () => {
    const groups = groupMemberPermissions(
      [row("members.view", "matrix"), row("candidates.view", "matrix")],
      "matrix",
    );
    expect(groups.map((g) => g.module)).toEqual(["recruitment", "members"]);
  });

  it("skips unknown action codes", () => {
    expect(groupMemberPermissions([row("does.not.exist", "matrix")], "matrix")).toEqual([]);
  });

  it("keeps two grants of the same action as two items", () => {
    const groups = groupMemberPermissions(
      [row("members.view", "grant"), row("members.view", "grant")],
      "grant",
    );
    expect(groups[0]?.items).toHaveLength(2);
  });

  it("returns nothing for an empty list", () => {
    expect(groupMemberPermissions([], "grant")).toEqual([]);
  });
});
