import { describe, expect, it } from "vitest";
import { appendPreview, safeHref } from "./site-content";

describe("safeHref", () => {
  it("allows safe internal, anchor and https links", () => {
    expect(safeHref("/about")).toBe("/about");
    expect(safeHref("/courses#x")).toBe("/courses#x");
    expect(safeHref("#courses")).toBe("#courses");
    expect(safeHref("https://a.com/b")).toBe("https://a.com/b");
    expect(safeHref("http://a.com/b")).toBe("http://a.com/b");
  });

  it("blocks dangerous and invalid protocols, returning fallback", () => {
    expect(safeHref("javascript:alert(1)")).toBe("/");
    expect(safeHref("JaVaScRiPt:alert(1)")).toBe("/");
    expect(safeHref("data:text/html,x")).toBe("/");
    expect(safeHref("//evil.com")).toBe("/");
    expect(safeHref("vbscript:test")).toBe("/");
  });

  it("handles blank or missing urls with default and custom fallbacks", () => {
    expect(safeHref("")).toBe("/");
    expect(safeHref(undefined)).toBe("/");
    expect(safeHref(null)).toBe("/");
    expect(safeHref("   ")).toBe("/");
    expect(safeHref("", "/custom-fallback")).toBe("/custom-fallback");
    expect(safeHref("javascript:void(0)", "#default")).toBe("#default");
  });
});

describe("appendPreview", () => {
  it("keeps internal links untouched outside preview mode", () => {
    expect(appendPreview("/about", false)).toBe("/about");
    expect(appendPreview("https://example.com", false)).toBe("https://example.com");
  });

  it("adds preview=1 to internal navigation pages in preview mode", () => {
    expect(appendPreview("/about", true)).toBe("/about?preview=1");
    expect(appendPreview("/verify/certificate", true)).toBe("/verify/certificate?preview=1");
  });

  it("keeps existing query strings and hashes", () => {
    expect(appendPreview("/courses?level=3", true)).toBe("/courses?level=3&preview=1");
    expect(appendPreview("/about#values", true)).toBe("/about?preview=1#values");
    expect(appendPreview("/about#x", true)).toBe("/about?preview=1#x");
  });

  it("never rewrites external or anchor links", () => {
    expect(appendPreview("https://a.com", true)).toBe("https://a.com");
    expect(appendPreview("https://example.com/about", true)).toBe("https://example.com/about");
    expect(appendPreview("#courses", true)).toBe("#courses");
  });

  it("sanitizes dangerous urls before appending preview", () => {
    expect(appendPreview("javascript:alert(1)", true)).not.toMatch(/^javascript:/i);
    expect(appendPreview("javascript:alert(1)", true)).toBe("/?preview=1");
    expect(appendPreview("//evil.com", true)).toBe("/?preview=1");
  });
});
