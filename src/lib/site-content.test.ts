import { describe, expect, it } from "vitest";
import { appendPreview } from "./site-content";

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
  });

  it("never rewrites external, protocol-relative, anchor or app links", () => {
    expect(appendPreview("https://example.com/about", true)).toBe("https://example.com/about");
    expect(appendPreview("//example.com/about", true)).toBe("//example.com/about");
    expect(appendPreview("#courses", true)).toBe("#courses");
    expect(appendPreview("mailto:community@themandarinleague.bond", true)).toBe(
      "mailto:community@themandarinleague.bond",
    );
  });
});
