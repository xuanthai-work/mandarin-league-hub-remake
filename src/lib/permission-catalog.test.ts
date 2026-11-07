import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { positionsFor } from "@/lib/recruitment";
import {
  can,
  NO_PERMISSIONS,
  outranksPosition,
  parseMyPermissions,
  PERMISSION_ACTIONS,
  POSITIONS,
  positionRank,
  type MyPermissions,
} from "./permission-catalog";

describe("action catalog", () => {
  it("has exactly 48 actions", () => expect(PERMISSION_ACTIONS).toHaveLength(48));

  it("has unique codes matching the SQL pattern", () => {
    const codes = PERMISSION_ACTIONS.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^[a-z]+(\.[a-z]+)+$/);
  });

  it("gives every action a non-empty module", () => {
    for (const action of PERMISSION_ACTIONS) expect(action.module.length).toBeGreaterThan(0);
  });
});

describe("migration parity", () => {
  const migrationsDir = path.join(process.cwd(), "drizzle/migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => /^(\d{4})_.*\.sql$/.test(f) && Number(f.slice(0, 4)) >= 50)
    .sort();

  const codes = new Set<string>();
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    for (const insertMatch of sql.matchAll(/INSERT INTO public\.permission_actions[\s\S]*?;/g)) {
      const block = insertMatch[0];
      for (const quoted of block.matchAll(/'([a-z]+(?:\.[a-z]+)+)'/g)) {
        if (quoted[1]) codes.add(quoted[1]);
      }
    }
    for (const deleteMatch of sql.matchAll(
      /DELETE FROM public\.permission_actions\s+WHERE\s+code\s*=\s*'([^']+)';/g,
    )) {
      if (deleteMatch[1]) codes.delete(deleteMatch[1]);
    }
  }

  it("inserts exactly the catalog's action codes", () => {
    expect(codes).toEqual(new Set(PERMISSION_ACTIONS.map((a) => a.code)));
  });
});

describe("positions", () => {
  it("matches positionsFor() for an ordinary department", () => {
    const ordinary = POSITIONS.filter((p) => !p.executive).map((p) => p.name);
    expect(new Set(ordinary)).toEqual(new Set(positionsFor("hr")));
  });

  it("matches positionsFor() for the executive department", () => {
    const executive = POSITIONS.filter((p) => p.executive).map((p) => p.name);
    expect(new Set(executive)).toEqual(new Set(positionsFor("executive")));
  });

  it("ranks positions 4 / 3 / 2 / 1", () => {
    expect(positionRank("Co-founder")).toBe(4);
    expect(positionRank("Trưởng Ban")).toBe(3);
    expect(positionRank("Phó Ban")).toBe(2);
    expect(positionRank("Thư ký")).toBe(1);
    expect(positionRank("Cố vấn chuyên môn")).toBe(1);
    expect(positionRank("Thành viên")).toBe(1);
    expect(positionRank("Chức vụ lạ")).toBe(1);
  });

  it("requires a strictly higher rank", () => {
    expect(outranksPosition("Trưởng Ban", "Trưởng Ban")).toBe(false);
    expect(outranksPosition("Trưởng Ban", "Phó Ban")).toBe(true);
    expect(outranksPosition("Phó Ban", "Co-founder")).toBe(false);
  });
});

describe("parseMyPermissions", () => {
  it("keeps valid data", () => {
    expect(parseMyPermissions({ is_admin: true, actions: { "members.view": "own" } })).toEqual({
      isAdmin: true,
      actions: { "members.view": "own" },
    });
  });

  it("drops unknown codes", () => {
    expect(
      parseMyPermissions({
        is_admin: false,
        actions: { "members.view": "all", "not.real": "all" },
      }),
    ).toEqual({ isAdmin: false, actions: { "members.view": "all" } });
  });

  it("falls back to no permissions on bad input", () => {
    expect(parseMyPermissions(null)).toEqual(NO_PERMISSIONS);
    expect(parseMyPermissions({ actions: {} })).toEqual(NO_PERMISSIONS);
    expect(parseMyPermissions({ is_admin: false, actions: { "members.view": "wide" } })).toEqual(
      NO_PERMISSIONS,
    );
  });
});

describe("can", () => {
  const withActions = (actions: MyPermissions["actions"]): MyPermissions => ({
    isAdmin: false,
    actions,
  });

  it("always allows admins", () => {
    expect(can({ isAdmin: true, actions: {} }, "members.view")).toBe(true);
  });

  it("denies actions the user does not have", () => {
    expect(can(NO_PERMISSIONS, "members.view")).toBe(false);
  });

  it("allows 'all' in every department", () => {
    const p = withActions({ "members.view": "all" });
    expect(can(p, "members.view", "comms", "hr")).toBe(true);
    expect(can(p, "members.view", "hr", "hr")).toBe(true);
    expect(can(p, "members.view", null, "hr")).toBe(true);
  });

  it("scopes 'own' to the user's department", () => {
    const p = withActions({ "members.view": "own" });
    expect(can(p, "members.view", "hr", "hr")).toBe(true);
    expect(can(p, "members.view", "comms", "hr")).toBe(false);
    expect(can(p, "members.view", undefined, "hr")).toBe(true);
    expect(can(p, "members.view", null, "hr")).toBe(false);
  });

  it("ignores department for actions that are not scoped", () => {
    const p = withActions({ "recruitment.view": "own" });
    expect(can(p, "recruitment.view", "comms", "hr")).toBe(true);
  });
});
