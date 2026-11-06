import { describe, expect, it } from "vitest";
import { HOME_DEFAULTS, SITE_DEFAULTS } from "@/lib/site-content";
import {
  HOME_BLOCKS,
  SITE_BLOCKS,
  changedKeys,
  fieldError,
  toHomeForm,
  toSiteForm,
} from "./site-content-fields";

describe("fieldError", () => {
  it("treats empty or whitespace-only inputs as valid (null)", () => {
    expect(fieldError("text", "")).toBeNull();
    expect(fieldError("area", "   ")).toBeNull();
    expect(fieldError("link", "")).toBeNull();
    expect(fieldError("url", "  ")).toBeNull();
    expect(fieldError("email", "")).toBeNull();
  });

  it("always allows text and area fields", () => {
    expect(fieldError("text", "Online Chinese Community")).toBeNull();
    expect(fieldError("area", "Dòng 1\nDòng 2")).toBeNull();
  });

  describe("link validation", () => {
    it("accepts relative links starting with /", () => {
      expect(fieldError("link", "/join")).toBeNull();
      expect(fieldError("link", "/courses/hsk")).toBeNull();
    });

    it("accepts http and https URLs", () => {
      expect(fieldError("link", "https://x.com/a")).toBeNull();
      expect(fieldError("link", "http://example.com/test")).toBeNull();
    });

    it("rejects protocol-relative, javascript, data, domain without protocol, or spaces", () => {
      const err = "Liên kết phải bắt đầu bằng / hoặc https://";
      expect(fieldError("link", "//evil.com")).toBe(err);
      expect(fieldError("link", "javascript:alert(1)")).toBe(err);
      expect(fieldError("link", "data:text/html,abc")).toBe(err);
      expect(fieldError("link", "www.abc.com")).toBe(err);
      expect(fieldError("link", "/path with spaces")).toBe(err);
      expect(fieldError("link", "https://example.com/path with spaces")).toBe(err);
    });
  });

  describe("url validation", () => {
    it("accepts http and https URLs", () => {
      expect(fieldError("url", "https://facebook.com/tml")).toBeNull();
      expect(fieldError("url", "http://localhost:3000")).toBeNull();
    });

    it("rejects relative links, missing protocols, or spaces", () => {
      const err = "Liên kết phải bắt đầu bằng https://";
      expect(fieldError("url", "/relative")).toBe(err);
      expect(fieldError("url", "//evil.com")).toBe(err);
      expect(fieldError("url", "facebook.com")).toBe(err);
      expect(fieldError("url", "https://facebook.com/with space")).toBe(err);
    });
  });

  describe("email validation", () => {
    it("accepts valid email addresses", () => {
      expect(fieldError("email", "community@themandarinleague.bond")).toBeNull();
      expect(fieldError("email", "user@domain.vn")).toBeNull();
      expect(fieldError("email", "admin.tml@sub.domain.com")).toBeNull();
    });

    it("rejects malformed email addresses", () => {
      const err = "Email không hợp lệ";
      expect(fieldError("email", "invalid-email")).toBe(err);
      expect(fieldError("email", "test@")).toBe(err);
      expect(fieldError("email", "test@domain")).toBe(err);
      expect(fieldError("email", "@domain.com")).toBe(err);
      expect(fieldError("email", "test @domain.com")).toBe(err);
    });
  });
});

describe("changedKeys", () => {
  it("detects modified string keys", () => {
    const a = { hero_title: "Old" };
    const b = { hero_title: "New" };
    expect(changedKeys(a, b)).toEqual(["hero_title"]);
  });

  it("ignores whitespace-only differences in string fields", () => {
    const a = { hero_title: "The Mandarin League" };
    const b = { hero_title: "  The Mandarin League  " };
    expect(changedKeys(a, b)).toEqual([]);
  });

  it("treats undefined and empty string as equivalent", () => {
    const a = { tagline: undefined, btn1_label: "" };
    const b = { tagline: "", btn1_label: undefined };
    expect(changedKeys(a, b)).toEqual([]);
  });

  it("detects changes in show object keys as show.<key>", () => {
    const a = {
      show: { about: true, carousel: true, courses: true, activities: true, cta: true },
    };
    const b = {
      show: { about: false, carousel: true, courses: true, activities: false, cta: true },
    };
    const diff = changedKeys(a, b);
    expect(diff.sort()).toEqual(["show.about", "show.activities"].sort());
  });

  it("returns empty array when both objects are empty or equivalent", () => {
    expect(changedKeys({}, {})).toEqual([]);
    expect(changedKeys({ show: { about: true } }, { show: { about: true } })).toEqual([]);
  });
});

describe("block definitions coverage", () => {
  it("includes each non-show string key of HOME_DEFAULTS exactly once in HOME_BLOCKS", () => {
    const defaultKeys = Object.keys(HOME_DEFAULTS).filter((k) => k !== "show");
    const blockFields = HOME_BLOCKS.flatMap((b) => b.fields.map((f) => f.key));

    for (const key of defaultKeys) {
      const count = blockFields.filter((k) => k === key).length;
      expect(count, `Key ${key} in HOME_DEFAULTS should appear exactly once in HOME_BLOCKS`).toBe(
        1,
      );
    }
    expect(blockFields.length).toBe(defaultKeys.length);
  });

  it("includes each string key of SITE_DEFAULTS exactly once in SITE_BLOCKS", () => {
    const defaultKeys = Object.keys(SITE_DEFAULTS);
    const blockFields = SITE_BLOCKS.flatMap((b) => b.fields.map((f) => f.key));

    for (const key of defaultKeys) {
      const count = blockFields.filter((k) => k === key).length;
      expect(count, `Key ${key} in SITE_DEFAULTS should appear exactly once in SITE_BLOCKS`).toBe(
        1,
      );
    }
    expect(blockFields.length).toBe(defaultKeys.length);
  });
});

describe("toHomeForm and toSiteForm", () => {
  it("keeps site defaults blank instead of populating built-in defaults", () => {
    expect(toSiteForm({}).email).toBe("");
    expect(toSiteForm({ email: "a@b.co" }).email).toBe("a@b.co");
  });

  it("merges show flags with defaults for home form", () => {
    const home = toHomeForm({ show: { courses: false } });
    expect(home.show.courses).toBe(false);
    expect(home.show.about).toBe(true);
  });

  it("returns empty diff for identical raw empty site forms", () => {
    expect(changedKeys(toSiteForm({ email: "" }), toSiteForm({ email: "" }))).toEqual([]);
  });
});
