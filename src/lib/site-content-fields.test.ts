import { describe, expect, it } from "vitest";
import { HOME_DEFAULTS, HOME_TEXT_KEYS, SITE_DEFAULTS } from "@/lib/site-content";
import {
  HOME_BLOCKS,
  HOME_SECTIONS,
  NAV_PAGES,
  SITE_BLOCKS,
  blocksOfSection,
  changedKeys,
  fieldError,
  toHomeForm,
  toSiteForm,
  describeChanges,
  auditBaseline,
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

describe("section / content block / navigation page structure", () => {
  it("lists exactly the eight homepage sections in order, plus the auxiliary block", () => {
    expect(
      HOME_SECTIONS.filter((section) => !section.auxiliary).map((section) => section.id),
    ).toEqual([
      "hero",
      "about",
      "organization",
      "courses",
      "faculty",
      "activities",
      "partners",
      "verify",
    ]);
    expect(
      HOME_SECTIONS.filter((section) => section.auxiliary).map((section) => section.id),
    ).toEqual(["cta"]);
  });

  it("keeps every content block inside an existing section (no pages in the sidebar)", () => {
    expect(HOME_BLOCKS.map((block) => block.id)).toEqual([
      "hero",
      "about",
      "values",
      "community",
      "community-groups",
      "organization",
      "courses",
      "faculty-section",
      "activities",
      "carousel",
      "news",
      "partners-section",
      "verify",
      "verify-certificate",
      "verify-hsk",
      "cta",
    ]);
    for (const block of HOME_BLOCKS) {
      expect(
        HOME_SECTIONS.some((section) => section.id === block.sectionId),
        `Block ${block.id} phải thuộc một Section`,
      ).toBe(true);
      expect("page" in block).toBe(false);
    }
  });

  it("keeps the Giới thiệu content blocks on one Section screen", () => {
    expect(blocksOfSection("about").map((block) => block.id)).toEqual([
      "about",
      "values",
      "community",
      "community-groups",
    ]);
    expect(blocksOfSection("verify").map((block) => block.id)).toEqual([
      "verify",
      "verify-certificate",
      "verify-hsk",
    ]);
    expect(blocksOfSection("activities").map((block) => block.id)).toEqual([
      "activities",
      "carousel",
      "news",
    ]);
  });

  it("manages navigation pages separately with their public route", () => {
    expect(NAV_PAGES.map((page) => [page.id, page.to])).toEqual([
      ["about-page", "/about"],
      ["community-page", "/community"],
      ["organization-page", "/organization"],
      ["hsk-page", "/courses/hsk"],
      ["courses-page", "/courses"],
      ["teachers-page", "/teachers"],
      ["activities-page", "/activities"],
      ["news-page", "/news"],
      ["partners-page", "/partners"],
      ["verify-certificate-page", "/verify/certificate"],
      ["verify-hsk-page", "/verify/hsk"],
      ["join-page", "/join"],
      ["contact-page", "/contact"],
    ]);
    for (const page of NAV_PAGES) {
      expect(HOME_BLOCKS.some((block) => block.id === page.id)).toBe(false);
      expect(HOME_SECTIONS.some((section) => section.id === page.sectionId)).toBe(true);
    }
  });

  it("never shares a field key between a Section block and a navigation page", () => {
    const blockKeys = new Set(HOME_BLOCKS.flatMap((block) => block.fields.map((f) => f.key)));
    for (const page of NAV_PAGES) {
      for (const field of page.fields) {
        expect(
          blockKeys.has(field.key),
          `Khóa ${field.key} vừa thuộc Section vừa thuộc trang điều hướng`,
        ).toBe(false);
      }
    }
  });

  it("points every CTA link at the navigation page it belongs to", () => {
    for (const block of HOME_BLOCKS) {
      for (const field of block.fields) {
        if (!field.navPage) continue;
        const page = NAV_PAGES.find((candidate) => candidate.id === field.navPage);
        expect(page, `CTA ${field.key} thiếu trang điều hướng ${field.navPage}`).toBeDefined();
        expect(field.fallback).toBe(page?.to);
      }
    }
  });

  it("includes each base string key of HOME_DEFAULTS exactly once in blocks + nav pages", () => {
    const defaultKeys = Object.keys(HOME_DEFAULTS).filter(
      (k) => k !== "show" && !k.endsWith("_en") && !k.endsWith("_zh"),
    );
    const blockFields = [...HOME_BLOCKS, ...NAV_PAGES].flatMap((block) =>
      block.fields.map((f) => f.key),
    );

    for (const key of defaultKeys) {
      const count = blockFields.filter((k) => k === key).length;
      expect(count, `Key ${key} in HOME_DEFAULTS should appear exactly once`).toBe(1);
    }
    expect(blockFields.length).toBe(defaultKeys.length);
  });

  it("includes each base string key of SITE_DEFAULTS exactly once in SITE_BLOCKS", () => {
    const defaultKeys = Object.keys(SITE_DEFAULTS).filter(
      (k) => !k.endsWith("_en") && !k.endsWith("_zh"),
    );
    const blockFields = SITE_BLOCKS.flatMap((b) => b.fields.map((f) => f.key));

    for (const key of defaultKeys) {
      const count = blockFields.filter((k) => k === key).length;
      expect(count, `Key ${key} in SITE_DEFAULTS should appear exactly once in SITE_BLOCKS`).toBe(
        1,
      );
    }
    expect(blockFields.length).toBe(defaultKeys.length);
  });

  it("localizes every text field of blocks and navigation pages", () => {
    const textKeys = [...HOME_BLOCKS, ...NAV_PAGES].flatMap((block) =>
      block.fields
        .filter((field) => field.kind === "text" || field.kind === "area")
        .map((field) => field.key),
    );
    expect(new Set(HOME_TEXT_KEYS)).toEqual(new Set(textKeys));
    expect(HOME_TEXT_KEYS.length).toBe(textKeys.length);
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

  it("keeps per-language text fields in the admin forms", () => {
    const home = toHomeForm({
      about_title: "Vi",
      about_title_en: "En",
      about_title_zh: "Zh",
    });
    expect(home.about_title).toBe("Vi");
    expect(home.about_title_en).toBe("En");
    expect(home.about_title_zh).toBe("Zh");
  });
});

describe("describeChanges", () => {
  it("detects text modifications", () => {
    const changes = describeChanges("home", { about_title: "Cũ" }, { about_title: "Mới" });
    expect(changes).toEqual([
      {
        id: "about_title",
        block: "Về TML",
        label: "Tiêu đề · VI",
        before: "Cũ",
        after: "Mới",
        beforeDefault: false,
        afterDefault: false,
      },
    ]);
  });

  it("handles clearing to default fallback with beforeDefault/afterDefault flags", () => {
    const changes = describeChanges(
      "home",
      { about_cta_label: "Tìm hiểu ngay" },
      { about_cta_label: "" },
    );
    expect(changes).toEqual([
      {
        id: "about_cta_label",
        block: "Về TML",
        label: "Chữ trên nút · VI",
        before: "Tìm hiểu ngay",
        after: "Tìm hiểu thêm",
        beforeDefault: false,
        afterDefault: true,
      },
    ]);
  });

  it("reports English/Chinese variants separately with translated fallbacks", () => {
    const en = describeChanges("home", { about_title_en: "Old" }, { about_title_en: "New" });
    expect(en).toEqual([
      {
        id: "about_title_en",
        block: "Về TML",
        label: "Tiêu đề · EN",
        before: "Old",
        after: "New",
        beforeDefault: false,
        afterDefault: false,
      },
    ]);

    const cleared = describeChanges("home", { about_title_en: "Custom" }, { about_title_en: "" });
    expect(cleared[0]).toMatchObject({
      id: "about_title_en",
      label: "Tiêu đề · EN",
      after: "Learn Chinese with a real community",
      afterDefault: true,
    });
  });

  it("shows 'Để trống (ẩn)' for fields with empty fallback like linkedin", () => {
    const changes = describeChanges(
      "site",
      { linkedin: "https://linkedin.com/company/tml" },
      { linkedin: "" },
    );
    expect(changes).toEqual([
      {
        id: "linkedin",
        block: "Liên hệ & Mạng xã hội",
        label: "LinkedIn",
        before: "https://linkedin.com/company/tml",
        after: "Để trống (ẩn)",
        beforeDefault: false,
        afterDefault: true,
      },
    ]);
  });

  it("handles toggle switches (Hiện -> Ẩn)", () => {
    const changes = describeChanges(
      "home",
      { show: { activities: true } },
      { show: { activities: false } },
    );
    expect(changes).toEqual([
      {
        id: "show.activities",
        block: "Hoạt động tiêu biểu",
        label: "Hiển thị trên trang chủ",
        before: "Hiện",
        after: "Ẩn",
        beforeDefault: false,
        afterDefault: false,
      },
    ]);
  });

  it("orders changes by visual block and field order", () => {
    const changes = describeChanges(
      "home",
      { cta_title: "Cũ", about_title: "Cũ" },
      { cta_title: "Mới", about_title: "Mới" },
    );
    expect(changes.map((c) => c.id)).toEqual(["about_title", "cta_title"]);
  });

  it("ignores unknown keys not in block definitions", () => {
    const changes = describeChanges("home", { unknown_key: "abc" }, { unknown_key: "xyz" });
    expect(changes).toEqual([]);
  });

  it("returns empty array when both revisions are identical", () => {
    const changes = describeChanges("home", { hero_title: "Same" }, { hero_title: "Same" });
    expect(changes).toEqual([]);
  });
});

describe("auditBaseline", () => {
  it("uses old_data for action 'publish'", () => {
    const rows = [
      {
        content_key: "home",
        action: "publish",
        old_data: { hero_title: "Live" },
        new_data: { hero_title: "Draft to publish" },
      },
    ];
    expect(auditBaseline(rows, 0)).toEqual({
      before: { hero_title: "Live" },
      title: "Thay đổi trên website",
    });
  });

  it("uses new_data of older row with the same content_key for 'save_draft', skipping other keys", () => {
    const rows = [
      {
        content_key: "home",
        action: "save_draft",
        old_data: {},
        new_data: { hero_title: "Draft 2" },
      },
      {
        content_key: "site",
        action: "save_draft",
        old_data: {},
        new_data: { email: "a@b.com" },
      },
      {
        content_key: "home",
        action: "save_draft",
        old_data: {},
        new_data: { hero_title: "Draft 1" },
      },
    ];
    expect(auditBaseline(rows, 0)).toEqual({
      before: { hero_title: "Draft 1" },
      title: "Thay đổi trong bản nháp",
    });
  });

  it("returns empty object for action 'create' without older row", () => {
    const rows = [
      {
        content_key: "home",
        action: "create",
        old_data: null,
        new_data: { hero_title: "Initial" },
      },
    ];
    expect(auditBaseline(rows, 0)).toEqual({
      before: {},
      title: "Nội dung ban đầu",
    });
  });

  it("uses old_data for save_draft when there is no older row with the same key", () => {
    const rows = [
      {
        content_key: "home",
        action: "save_draft",
        old_data: { hero_title: "Initial live" },
        new_data: { hero_title: "Draft" },
      },
    ];
    expect(auditBaseline(rows, 0)).toEqual({
      before: { hero_title: "Initial live" },
      title: "So với bản đang hiển thị lúc đó",
    });
  });
});
