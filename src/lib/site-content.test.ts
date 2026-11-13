import { describe, expect, it } from "vitest";
import { localizeContent, mergeContent } from "./site-content";

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

  it("uses the per-language custom text when the admin filled it in", () => {
    const raw = mergeContent("home", {
      hero_lead: "Lời dẫn Việt",
      hero_lead_en: "English lead",
      hero_lead_zh: "中文导语",
      btn1_url: "/join-us",
    });
    expect(localizeContent("home", raw, "vi").hero_lead).toBe("Lời dẫn Việt");
    expect(localizeContent("home", raw, "en").hero_lead).toBe("English lead");
    expect(localizeContent("home", raw, "zh").hero_lead).toBe("中文导语");
    expect(localizeContent("home", raw, "en").btn1_url).toBe("/join-us");
  });

  it("falls back to component defaults when a language variant is empty", () => {
    const raw = mergeContent("home", { hero_lead: "Lời dẫn Việt", about_title: "Về chúng tôi" });
    const en = localizeContent("home", raw, "en");
    expect(en.hero_lead).toBe("");
    expect(en.about_title).toBe("");
    expect(en.hero_lead_en).toBe("");
  });

  it("localizes the site tagline and footer note independently", () => {
    const raw = mergeContent("site", {
      tagline: "Khẩu hiệu Việt",
      tagline_en: "English tagline",
      tagline_zh: "中文标语",
      footer_note: "Bản quyền Việt",
      footer_note_en: "English rights",
    });
    expect(localizeContent("site", raw, "en").tagline).toBe("English tagline");
    expect(localizeContent("site", raw, "en").footer_note).toBe("English rights");
    expect(localizeContent("site", raw, "zh").tagline).toBe("中文标语");
    expect(localizeContent("site", raw, "zh").footer_note).toBe("");
  });
});
