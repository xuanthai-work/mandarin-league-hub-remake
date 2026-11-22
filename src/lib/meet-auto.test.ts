import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearBotAccessTokenCache, getBotAccessToken } from "./meet-api.server";
import { AUTO_MIN_MINUTES, classifyConference, formatAutoReason } from "./meet-auto";

describe("classifyConference", () => {
  it("returns not_ended when start or end is missing", () => {
    expect(classifyConference(null, "2026-11-22T10:30:00Z")).toBe("not_ended");
    expect(classifyConference("2026-11-22T10:00:00Z", null)).toBe("not_ended");
    expect(classifyConference(undefined, undefined)).toBe("not_ended");
  });

  it("returns not_ended when end is before start", () => {
    expect(classifyConference("2026-11-22T10:30:00Z", "2026-11-22T10:00:00Z")).toBe("not_ended");
  });

  it("returns too_short when meeting is under 30 minutes (e.g. 29 mins)", () => {
    const start = "2026-11-22T10:00:00Z";
    const end = "2026-11-22T10:29:59Z";
    expect(classifyConference(start, end)).toBe("too_short");
  });

  it("returns ok when meeting is exactly 30 minutes", () => {
    const start = "2026-11-22T10:00:00Z";
    const end = "2026-11-22T10:30:00Z";
    expect(classifyConference(start, end)).toBe("ok");
  });

  it("returns ok when meeting is 90 minutes", () => {
    const start = "2026-11-22T10:00:00Z";
    const end = "2026-11-22T11:30:00Z";
    expect(classifyConference(start, end)).toBe("ok");
  });

  it("respects AUTO_MIN_MINUTES constant", () => {
    expect(AUTO_MIN_MINUTES).toBe(30);
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
