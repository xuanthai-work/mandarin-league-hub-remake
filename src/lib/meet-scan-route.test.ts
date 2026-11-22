import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/api/public/meet-scan";

vi.mock("@/lib/meet-auto.server", () => ({
  scanBotConferences: vi.fn().mockResolvedValue([
    { conferenceRecord: "conferenceRecords/r1", status: "scored" },
    { conferenceRecord: "conferenceRecords/r2", status: "skipped" },
    { conferenceRecord: "conferenceRecords/r3", status: "error" },
  ]),
}));

describe("GET /api/public/meet-scan", () => {
  const originalEnv = { ...process.env };
  const handlers = Route.options.server?.handlers as
    { GET?: (ctx: { request: Request }) => Promise<Response> } | undefined;
  const getHandler = handlers?.GET;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns 401 when CRON_SECRET is not configured", async () => {
    delete process.env["CRON_SECRET"];
    const req = new Request("http://localhost/api/public/meet-scan", {
      headers: { authorization: "Bearer secret-1234567890" },
    });
    const res = await getHandler!({ request: req } as never);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("returns 401 when authorization header is missing or invalid", async () => {
    process.env["CRON_SECRET"] = "my-secret-key-123456";
    const req1 = new Request("http://localhost/api/public/meet-scan");
    const res1 = await getHandler!({ request: req1 } as never);
    expect(res1.status).toBe(401);

    const req2 = new Request("http://localhost/api/public/meet-scan", {
      headers: { authorization: "Bearer wrong-secret-123456" },
    });
    const res2 = await getHandler!({ request: req2 } as never);
    expect(res2.status).toBe(401);
  });

  it("returns 200 with aggregate metrics when authorized", async () => {
    process.env["CRON_SECRET"] = "my-secret-key-123456";
    const req = new Request("http://localhost/api/public/meet-scan", {
      headers: { authorization: "Bearer my-secret-key-123456" },
    });
    const res = await getHandler!({ request: req } as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      ok: true,
      processed: 3,
      scored: 1,
      errors: 1,
    });
    expect(JSON.stringify(json)).not.toContain("conferenceRecords");
  });
});
