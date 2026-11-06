import { describe, expect, it } from "vitest";
import { HOME_DEFAULTS, SITE_DEFAULTS, localizeContent, mergeContent } from "./site-content";

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
  it("mergeContent home contains empty stat1_value by default", () => {
    expect(mergeContent("home", {}).stat1_value).toBe("");
  });
});

describe("localizeContent", () => {
  it("keeps all custom text when language is Vietnamese (vi)", () => {
    const raw = mergeContent("home", {
      hero_lead: "Lời dẫn Việt",
      stat1_value: "100+",
      btn1_url: "/join-us",
    });
    const result = localizeContent("home", raw, "vi");
    expect(result.hero_lead).toBe("Lời dẫn Việt");
    expect(result.stat1_value).toBe("100+");
    expect(result.btn1_url).toBe("/join-us");
  });

  it("resets text fields to blank for Chinese (zh) while preserving non-text fields like btn1_url and show", () => {
    const raw = mergeContent("home", {
      hero_lead: "Lời dẫn Việt",
      stat1_value: "100+",
      btn1_url: "/join-us",
      show: { courses: false },
    });
    const result = localizeContent("home", raw, "zh");
    expect(result.hero_lead).toBe("");
    expect(result.stat1_value).toBe("");
    expect(result.btn1_url).toBe("/join-us");
    expect(result.show.courses).toBe(false);
  });

  it("resets tagline and footer_note for English (en) while keeping email and facebook", () => {
    const raw = mergeContent("site", {
      tagline: "Khẩu hiệu Việt",
      footer_note: "Bản quyền Việt",
      email: "hello@test.com",
      facebook: "https://fb.com/custom",
    });
    const result = localizeContent("site", raw, "en");
    expect(result.tagline).toBe("");
    expect(result.footer_note).toBe("");
    expect(result.email).toBe("hello@test.com");
    expect(result.facebook).toBe("https://fb.com/custom");
  });
});
