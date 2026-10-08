import { describe, expect, it } from "vitest";
import { mergeContent } from "./site-content";

describe("site content fallback", () => {
  it("blank fields fall back to the default email", () => {
    expect(mergeContent("site", { email: "  " }).email).toBe("community@themandarinleague.bond");
  });
  it("a hidden section stays hidden while others stay visible", () => {
    const h = mergeContent("home", { show: { courses: false } });
    expect(h.show.courses).toBe(false);
    expect(h.show.about).toBe(true);
  });
  it("broken data never crashes and returns defaults", () => {
    expect(mergeContent("home", null).show.cta).toBe(true);
  });
});
