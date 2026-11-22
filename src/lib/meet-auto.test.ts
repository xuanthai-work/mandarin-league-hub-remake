import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearBotAccessTokenCache, getBotAccessToken } from "./meet-api.server";
import {
  AUTO_MIN_MINUTES,
  classifyConference,
  formatAutoReason,
  isSettledRun,
  MEET_POINTS,
  pickScorable,
  scoringKindFor,
} from "./meet-auto";

describe("MEET_POINTS", () => {
  it("is 5 points flat for all meetings", () => {
    expect(MEET_POINTS).toBe(5);
  });
});

describe("scoringKindFor", () => {
  it("maps work to work, club to club", () => {
    expect(scoringKindFor("work")).toBe("work");
    expect(scoringKindFor("club")).toBe("club");
  });
});

describe("isSettledRun", () => {
  it("always returns true for scored and too_short, even when force = true", () => {
    expect(isSettledRun("scored")).toBe(true);
    expect(isSettledRun("scored", false)).toBe(true);
    expect(isSettledRun("scored", true)).toBe(true);

    expect(isSettledRun("too_short")).toBe(true);
    expect(isSettledRun("too_short", false)).toBe(true);
    expect(isSettledRun("too_short", true)).toBe(true);
  });

  it("returns true for no_members and unknown_room when force is falsy, false when force is true", () => {
    expect(isSettledRun("no_members")).toBe(true);
    expect(isSettledRun("no_members", false)).toBe(true);
    expect(isSettledRun("no_members", true)).toBe(false);

    expect(isSettledRun("unknown_room")).toBe(true);
    expect(isSettledRun("unknown_room", false)).toBe(true);
    expect(isSettledRun("unknown_room", true)).toBe(false);
  });

  it("returns false for error, running, empty string, or unknown statuses", () => {
    expect(isSettledRun("error")).toBe(false);
    expect(isSettledRun("error", false)).toBe(false);
    expect(isSettledRun("error", true)).toBe(false);

    expect(isSettledRun("running")).toBe(false);
    expect(isSettledRun("running", false)).toBe(false);
    expect(isSettledRun("running", true)).toBe(false);

    expect(isSettledRun("")).toBe(false);
    expect(isSettledRun("", true)).toBe(false);

    expect(isSettledRun("something_else")).toBe(false);
    expect(isSettledRun("something_else", true)).toBe(false);
  });
});

describe("pickScorable", () => {
  const members = [
    { id: "1", full_name: "Nguyen Van A", department: "tech" },
    { id: "2", full_name: "Tran Thi B", department: "hr" },
    { id: "3", full_name: "Le Van C", department: "tech" },
  ];

  it("filters by department for work rooms: matching is scored, others are outside", () => {
    const { scored, outside } = pickScorable("work", "tech", members);
    expect(scored.map((m) => m.id)).toEqual(["1", "3"]);
    expect(outside.map((m) => m.id)).toEqual(["2"]);
  });

  it("treats all members as outside when work room has null department", () => {
    const { scored, outside } = pickScorable("work", null, members);
    expect(scored).toEqual([]);
    expect(outside.map((m) => m.id)).toEqual(["1", "2", "3"]);
  });

  it("scores all members for club room regardless of department", () => {
    const { scored, outside } = pickScorable("club", null, members);
    expect(scored.map((m) => m.id)).toEqual(["1", "2", "3"]);
    expect(outside).toEqual([]);
  });

  it("handles empty matched array cleanly", () => {
    expect(pickScorable("work", "tech", [])).toEqual({ scored: [], outside: [] });
    expect(pickScorable("club", null, [])).toEqual({ scored: [], outside: [] });
  });
});

describe("classifyConference", () => {
  it("returns not_ended when start or end is missing", () => {
    expect(classifyConference(null, "2026-11-22T10:30:00Z")).toBe("not_ended");
    expect(classifyConference("2026-11-22T10:00:00Z", null)).toBe("not_ended");
    expect(classifyConference(undefined, undefined)).toBe("not_ended");
  });

  it("returns not_ended when end is before start", () => {
    expect(classifyConference("2026-11-22T10:30:00Z", "2026-11-22T10:00:00Z")).toBe("not_ended");
  });

  it("returns too_short when meeting is under 20 minutes (e.g. 19 mins)", () => {
    const start = "2026-11-22T10:00:00Z";
    const end = "2026-11-22T10:19:59Z";
    expect(classifyConference(start, end)).toBe("too_short");
  });

  it("returns ok when meeting is exactly 20 minutes", () => {
    const start = "2026-11-22T10:00:00Z";
    const end = "2026-11-22T10:20:00Z";
    expect(classifyConference(start, end)).toBe("ok");
  });

  it("returns ok when meeting is 90 minutes", () => {
    const start = "2026-11-22T10:00:00Z";
    const end = "2026-11-22T11:30:00Z";
    expect(classifyConference(start, end)).toBe("ok");
  });

  it("respects AUTO_MIN_MINUTES constant", () => {
    expect(AUTO_MIN_MINUTES).toBe(20);
  });
});

describe("formatAutoReason", () => {
  it("formats work meeting with department label and date in Asia/Ho_Chi_Minh", () => {
    // 2026-11-22T20:00:00Z is 03:00 on 2026-11-23 in Asia/Ho_Chi_Minh (+7)
    const reason = formatAutoReason("work", "Công nghệ & Hệ thống", "2026-11-22T20:00:00Z");
    expect(reason).toBe(
      "Điểm danh Họp ban Công nghệ & Hệ thống - 23/11/2026 (tự động qua Google Meet)",
    );
  });

  it("formats club meeting correctly with date in Asia/Ho_Chi_Minh", () => {
    const reason = formatAutoReason("club", null, "2026-11-22T20:00:00Z");
    expect(reason).toBe("Điểm danh Họp toàn thể - 23/11/2026 (tự động qua Google Meet)");
  });

  it("truncates reason if longer than 300 characters", () => {
    const longDept = "A".repeat(400);
    const reason = formatAutoReason("work", longDept, "2026-11-22T10:00:00Z");
    expect(reason.length).toBeLessThanOrEqual(300);
  });
});

describe("getBotAccessToken", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    clearBotAccessTokenCache();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("throws with missing variable names when env vars are not set", async () => {
    delete process.env["GOOGLE_OAUTH_CLIENT_ID"];
    delete process.env["GOOGLE_OAUTH_CLIENT_SECRET"];
    delete process.env["MEET_BOT_REFRESH_TOKEN"];

    await expect(getBotAccessToken()).rejects.toThrowError(
      /Thiếu biến môi trường: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, MEET_BOT_REFRESH_TOKEN/,
    );
  });

  it("fetches token from Google OAuth and caches it", async () => {
    process.env["GOOGLE_OAUTH_CLIENT_ID"] = "mock-client-id";
    process.env["GOOGLE_OAUTH_CLIENT_SECRET"] = "mock-client-secret";
    process.env["MEET_BOT_REFRESH_TOKEN"] = "mock-refresh-token";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "mock-access-token-12345",
        expires_in: 3600,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const token1 = await getBotAccessToken();
    expect(token1).toBe("mock-access-token-12345");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call should return cached token without fetch
    const token2 = await getBotAccessToken();
    expect(token2).toBe("mock-access-token-12345");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws clear error on invalid_grant and clears cache", async () => {
    process.env["GOOGLE_OAUTH_CLIENT_ID"] = "mock-client-id";
    process.env["GOOGLE_OAUTH_CLIENT_SECRET"] = "mock-client-secret";
    process.env["MEET_BOT_REFRESH_TOKEN"] = "invalid-refresh-token";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: "invalid_grant",
        error_description: "Token has been expired or revoked.",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBotAccessToken()).rejects.toThrowError(
      "Bot Google cần cấp quyền lại (invalid_grant).",
    );
  });

  it("never includes client secret or refresh token in error message", async () => {
    process.env["GOOGLE_OAUTH_CLIENT_ID"] = "mock-client-id";
    process.env["GOOGLE_OAUTH_CLIENT_SECRET"] = "super-secret-password-xyz";
    process.env["MEET_BOT_REFRESH_TOKEN"] = "super-secret-refresh-token-123";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: "server_error",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBotAccessToken()).rejects.toThrow();
    try {
      await getBotAccessToken();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).not.toContain("super-secret-password-xyz");
      expect(msg).not.toContain("super-secret-refresh-token-123");
    }
  });
});
