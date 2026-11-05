import { describe, expect, it } from "vitest";
import { librarySessionSchema, passTokenSchema } from "./member-library";
import { domainRedirect } from "./domain";

describe("Member Pass input boundary", () => {
  it("accepts phase 1 random QR tokens, not printed member codes", () => {
    expect(passTokenSchema.safeParse("a".repeat(48)).success).toBe(true);
    expect(passTokenSchema.safeParse("TML-MBR-2610-0001").success).toBe(false);
  });
  it("rejects invalid and oversized tokens", () => {
    for (const token of ["", "g".repeat(48), "a".repeat(49), " a".repeat(24)])
      expect(passTokenSchema.safeParse(token).success).toBe(false);
  });
  it("a QR token cannot masquerade as a library session", () => {
    expect(librarySessionSchema.safeParse("a".repeat(48)).success).toBe(false);
    expect(librarySessionSchema.safeParse("b".repeat(64)).success).toBe(true);
  });
  it("QR access lives on the member portal and retains the scanned token across portal redirects", () => {
    expect(domainRedirect("themandarinleague.bond", "/library-access", "?pass=abc")).toBe(
      "https://member.themandarinleague.bond/library-access?pass=abc",
    );
    expect(domainRedirect("member.themandarinleague.bond", "/library-access")).toBeNull();
  });
});
