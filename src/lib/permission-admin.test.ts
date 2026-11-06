import { describe, expect, it } from "vitest";
import { PERMISSION_ACTIONS } from "./permission-catalog";
import {
  ALL_DEPARTMENTS_KEY,
  MODULE_LABELS,
  actionGroups,
  auditSummary,
  cellState,
  expiryFromDate,
  grantStatus,
  positionsFor,
  scopeLabel,
  type AuditRow,
  type MatrixRow,
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
    expect(total).toBe(47);
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

describe("cellState", () => {
  const rows: MatrixRow[] = [
    { department: "hr", position: "Trưởng Ban", action: "members.view", scope: "own" },
    { department: "*", position: "Phó Ban", action: "members.view", scope: "all" },
  ];

  it("reads the row of the exact department", () => {
    expect(cellState(rows, "hr", "Trưởng Ban", "members.view")).toEqual({
      own: "own",
      inherited: null,
    });
  });

  it("surfaces the all-departments row as inherited", () => {
    expect(cellState(rows, "hr", "Phó Ban", "members.view")).toEqual({
      own: null,
      inherited: "all",
    });
  });

  it("does not inherit into the executive board or the all-departments tab", () => {
    expect(cellState(rows, "executive", "Phó Ban", "members.view").inherited).toBeNull();
    expect(cellState(rows, ALL_DEPARTMENTS_KEY, "Phó Ban", "members.view").inherited).toBeNull();
  });
});

describe("scopeLabel", () => {
  it("names each scope", () => {
    expect(scopeLabel(null, true)).toBe("Không");
    expect(scopeLabel("own", true)).toBe("Ban mình");
    expect(scopeLabel("all", true)).toBe("Toàn bộ");
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
      "từ Ban mình thành Toàn bộ",
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
