import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredToken,
  MEET_TOKEN_STORAGE_KEY,
  readStoredToken,
  storeToken,
  TOKEN_SAFETY_MS,
} from "./meet-connection";

describe("meet-connection storage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(readStoredToken()).toBeNull();
  });

  it("stores and reads a valid token before expiry", () => {
    const now = 1_000_000;
    storeToken("test-token-123", 3600, now);
    expect(readStoredToken(now + 1000)).toBe("test-token-123");
  });

  it("falls back to 3600s when expiresInSec is invalid or undefined", () => {
    const now = 1_000_000;
    storeToken("test-token-fallback", undefined, now);
    // 3600s = 3_600_000ms. At now + 3_500_000ms (more than 60s before expiry), it should still be valid
    expect(readStoredToken(now + 3_500_000)).toBe("test-token-fallback");
  });

  it("expires token when remaining time is less than or equal to TOKEN_SAFETY_MS", () => {
    const now = 1_000_000;
    storeToken("expiring-token", 120, now); // expires at now + 120_000
    // At now + 60_000, remaining is 60_000 which is <= TOKEN_SAFETY_MS (60_000)
    expect(readStoredToken(now + 60_000)).toBeNull();
    // After expiring, it should have cleaned up the key
    expect(window.sessionStorage.getItem(MEET_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("clears stored token with clearStoredToken", () => {
    storeToken("token-to-clear", 3600);
    expect(readStoredToken()).toBe("token-to-clear");
    clearStoredToken();
    expect(readStoredToken()).toBeNull();
  });

  it("handles corrupted JSON gracefully", () => {
    window.sessionStorage.setItem(MEET_TOKEN_STORAGE_KEY, "{bad json");
    expect(readStoredToken()).toBeNull();
  });

  it("handles invalid object formats", () => {
    window.sessionStorage.setItem(MEET_TOKEN_STORAGE_KEY, JSON.stringify({ token: 123 }));
    expect(readStoredToken()).toBeNull();

    window.sessionStorage.setItem(
      MEET_TOKEN_STORAGE_KEY,
      JSON.stringify({ token: "ok", exp: "not-a-number" }),
    );
    expect(readStoredToken()).toBeNull();
  });
});
