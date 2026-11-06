import { describe, expect, it } from "vitest";
import { INTEGRATIONS, buildSystemStatus } from "./system-status";

const ALL_KEYS = INTEGRATIONS.flatMap((it) => [...it.required, ...it.optional]);

const envWith = (keys: string[], value = "set") => Object.fromEntries(keys.map((k) => [k, value]));

describe("buildSystemStatus", () => {
  it("marks every integration missing with an empty env", () => {
    const status = buildSystemStatus({});
    expect(status.every((s) => s.level === "missing")).toBe(true);
    expect(status.find((s) => s.id === "supabase_admin")?.missing).toEqual([
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
  });

  it("marks every integration ok when every variable is set", () => {
    const status = buildSystemStatus(envWith(ALL_KEYS));
    expect(status.every((s) => s.level === "ok")).toBe(true);
    expect(status.every((s) => s.missing.length === 0)).toBe(true);
  });

  it("reports partial when only an optional variable is missing", () => {
    const status = buildSystemStatus({ RESEND_API_KEY: "re_123" });
    const email = status.find((s) => s.id === "email");
    expect(email?.level).toBe("partial");
    expect(email?.missing).toEqual(["RESEND_FROM"]);
  });

  it("treats whitespace-only values as missing", () => {
    const status = buildSystemStatus({ RESEND_API_KEY: "re_123", RESEND_FROM: "   " });
    const email = status.find((s) => s.id === "email");
    expect(email?.level).toBe("partial");
    expect(email?.missing).toEqual(["RESEND_FROM"]);
  });

  it("never exposes env values", () => {
    const status = buildSystemStatus(envWith(ALL_KEYS, "sk-SECRET-123"));
    expect(JSON.stringify(status)).not.toContain("SECRET");
  });
});
