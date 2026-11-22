import { describe, expect, it } from "vitest";
import { isValidCronAuth } from "./cron-auth";

describe("isValidCronAuth", () => {
  const validSecret = "this-is-a-valid-cron-secret-123456";

  it("returns true when header matches Bearer <secret>", () => {
    expect(isValidCronAuth(`Bearer ${validSecret}`, validSecret)).toBe(true);
  });

  it("returns false when secret is incorrect", () => {
    expect(isValidCronAuth("Bearer wrong-secret-1234567890", validSecret)).toBe(false);
  });

  it("returns false when authHeader is missing or empty", () => {
    expect(isValidCronAuth(null, validSecret)).toBe(false);
    expect(isValidCronAuth(undefined, validSecret)).toBe(false);
    expect(isValidCronAuth("", validSecret)).toBe(false);
  });

  it("returns false when header does not start with Bearer ", () => {
    expect(isValidCronAuth(validSecret, validSecret)).toBe(false);
    expect(isValidCronAuth(`Basic ${validSecret}`, validSecret)).toBe(false);
    expect(isValidCronAuth(`Token ${validSecret}`, validSecret)).toBe(false);
  });

  it("returns false when secret is empty or whitespace", () => {
    expect(isValidCronAuth("Bearer abc", null)).toBe(false);
    expect(isValidCronAuth("Bearer abc", undefined)).toBe(false);
    expect(isValidCronAuth("Bearer abc", "")).toBe(false);
    expect(isValidCronAuth("Bearer abc", "   ")).toBe(false);
  });

  it("returns false when secret is shorter than 16 characters", () => {
    const shortSecret = "short-secret-12"; // 15 chars
    expect(shortSecret.length).toBe(15);
    expect(isValidCronAuth(`Bearer ${shortSecret}`, shortSecret)).toBe(false);
  });

  it("returns false when header token length differs from secret", () => {
    expect(isValidCronAuth("Bearer short", validSecret)).toBe(false);
    expect(isValidCronAuth(`Bearer ${validSecret}-extra-bytes`, validSecret)).toBe(false);
  });
});
