import {
  HOME_DEFAULTS,
  SITE_DEFAULTS,
  mergeContent,
  type HomeContent,
  type SiteSettings,
} from "@/lib/site-content";
import { trPhrase, type Lang } from "@/lib/i18n";
import { HOME_BLOCKS, HOME_SECTIONS, NAV_PAGES, SITE_BLOCKS } from "@/lib/site-content-structure";
import type { ContentBlock, ContentField } from "@/lib/site-content-structure";

export type {
  ContentBlock,
  ContentField,
  FieldKind,
  HomeSection,
  HomeTextKey,
  ManageRoute,
  NavPage,
  NavRoute,
  SiteKey,
} from "@/lib/site-content-structure";
export {
  HOME_BLOCKS,
  HOME_SECTIONS,
  NAV_PAGES,
  SITE_BLOCKS,
  blocksOfSection,
  navPagesOfSection,
  findBlock,
  findNavPage,
  isLocalizedField,
} from "@/lib/site-content-structure";

const EMPTY_SITE = Object.fromEntries(
  Object.keys(SITE_DEFAULTS).map((k) => [k, ""]),
) as SiteSettings;

function pickStrings<T extends object>(base: T, raw: unknown): T {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...base } as Record<string, unknown>;
  for (const k of Object.keys(base)) {
    if (k !== "show" && typeof src[k] === "string") out[k] = src[k];
  }
  return out as T;
}

/** Giá trị cho form admin: chữ thô trong draft (trống = ""), không điền chữ mặc định. */
export function toHomeForm(raw: unknown): HomeContent {
  return { ...pickStrings(HOME_DEFAULTS, raw), show: mergeContent("home", raw).show };
}

export function toSiteForm(raw: unknown): SiteSettings {
  return pickStrings(EMPTY_SITE, raw);
}

/** Trả về câu lỗi tiếng Việt, hoặc null nếu hợp lệ. Ô trống luôn hợp lệ. */
export function fieldError(kind: string, value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  switch (kind) {
    case "link": {
      const isRelative = v.startsWith("/") && !v.startsWith("//") && !/\s/.test(v);
      const isAbsolute = /^https?:\/\/\S+$/i.test(v);
      if (isRelative || isAbsolute) return null;
      return "Liên kết phải bắt đầu bằng / hoặc https://";
    }
    case "url": {
      if (/^https?:\/\/\S+$/i.test(v)) return null;
      return "Liên kết phải bắt đầu bằng https://";
    }
    case "email": {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
      return "Email không hợp lệ";
    }
    default:
      return null;
  }
}

/** Danh sách khóa khác nhau giữa hai bản; với khóa show trả về dạng "show.about". */
export function changedKeys(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  const diff: string[] = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  allKeys.delete("show");

  for (const k of allKeys) {
    const valA = a[k];
    const valB = b[k];
    const strA = valA === undefined || valA === null ? "" : String(valA).trim();
    const strB = valB === undefined || valB === null ? "" : String(valB).trim();
    if (strA !== strB) {
      diff.push(k);
    }
  }

  const showA = a["show"] as Record<string, unknown> | undefined;
  const showB = b["show"] as Record<string, unknown> | undefined;
  if (showA || showB) {
    const showKeys = new Set([...Object.keys(showA ?? {}), ...Object.keys(showB ?? {})]);
    for (const sk of showKeys) {
      const bA = Boolean(showA?.[sk]);
      const bB = Boolean(showB?.[sk]);
      if (bA !== bB) {
        diff.push(`show.${sk}`);
      }
    }
  }

  return diff;
}

/** Một thay đổi để hiển thị. Ô trống được hiển thị bằng chữ mặc định (cờ *Default = true). */
export type FieldChange = {
  id: string; // "hero_title" hoặc "show.about"
  block: string; // tên khối, ví dụ "Banner đầu trang"
  label: string; // tên ô, hoặc "Hiển thị trên trang chủ" với công tắc
  before: string;
  after: string;
  beforeDefault: boolean;
  afterDefault: boolean;
};

const EMPTY_HIDDEN = "Để trống (ẩn)";

const TEXT_LANGS: { lang: Lang; suffix: "" | "_en" | "_zh"; tag: string }[] = [
  { lang: "vi", suffix: "", tag: "VI" },
  { lang: "en", suffix: "_en", tag: "EN" },
  { lang: "zh", suffix: "_zh", tag: "ZH" },
];

/** So hai bản (draft/published/old_data/new_data thô), trả danh sách thay đổi theo thứ tự trên màn. */
export function describeChanges(
  key: "home" | "site",
  beforeRaw: unknown,
  afterRaw: unknown,
): FieldChange[] {
  const a = (key === "home" ? toHomeForm(beforeRaw) : toSiteForm(beforeRaw)) as unknown as Record<
    string,
    unknown
  >;
  const b = (key === "home" ? toHomeForm(afterRaw) : toSiteForm(afterRaw)) as unknown as Record<
    string,
    unknown
  >;
  const changed = new Set(changedKeys(a, b));
  const out: FieldChange[] = [];

  const push = (block: ContentBlock<string>, f: ContentField<string>) => {
    const isText = f.kind === "text" || f.kind === "area";
    if (!isText) {
      if (!changed.has(f.key)) return;
      const va = String(a[f.key] ?? "").trim();
      const vb = String(b[f.key] ?? "").trim();
      out.push({
        id: f.key,
        block: block.label,
        label: f.label,
        before: va || f.fallback || EMPTY_HIDDEN,
        after: vb || f.fallback || EMPTY_HIDDEN,
        beforeDefault: !va,
        afterDefault: !vb,
      });
      return;
    }
    for (const { lang, suffix, tag } of TEXT_LANGS) {
      const id = `${f.key}${suffix}`;
      if (!changed.has(id)) continue;
      const va = String(a[id] ?? "").trim();
      const vb = String(b[id] ?? "").trim();
      const fallback = lang === "vi" ? f.fallback : trPhrase(lang, f.fallback);
      out.push({
        id,
        block: block.label,
        label: `${f.label} · ${tag}`,
        before: va || fallback || EMPTY_HIDDEN,
        after: vb || fallback || EMPTY_HIDDEN,
        beforeDefault: !va,
        afterDefault: !vb,
      });
    }
  };

  if (key === "site") {
    for (const block of SITE_BLOCKS as ContentBlock<string>[]) {
      for (const f of block.fields) push(block, f);
    }
    return out;
  }

  for (const block of HOME_BLOCKS as ContentBlock<string>[]) {
    if (block.toggle && changed.has(`show.${block.toggle}`)) {
      const section = HOME_SECTIONS.find((item) => item.id === block.sectionId);
      const sectionOwnsToggle = section?.toggle === block.toggle;
      const sa = (a["show"] as Record<string, boolean> | undefined)?.[block.toggle];
      const sb = (b["show"] as Record<string, boolean> | undefined)?.[block.toggle];
      out.push({
        id: `show.${block.toggle}`,
        block: sectionOwnsToggle ? section!.label : block.label,
        label: "Hiển thị trên trang chủ",
        before: sa ? "Hiện" : "Ẩn",
        after: sb ? "Hiện" : "Ẩn",
        beforeDefault: false,
        afterDefault: false,
      });
    }
    for (const f of block.fields) push(block, f);
  }

  // Trang điều hướng được báo riêng để không lẫn với nội dung Section.
  for (const page of NAV_PAGES as unknown as ContentBlock<string>[]) {
    const pageBlock = {
      ...page,
      label: `Trang điều hướng · ${page.label}`,
    } as ContentBlock<string>;
    for (const f of page.fields) push(pageBlock, f);
  }

  return out;
}

export type AuditRowLite = {
  content_key: string;
  action: string; // "create" | "save_draft" | "publish"
  old_data: unknown;
  new_data: unknown;
};

/** rows sắp xếp MỚI → CŨ (như query). Trả về bản để so với rows[i].new_data và tiêu đề mô tả. */
export function auditBaseline(rows: AuditRowLite[], i: number): { before: unknown; title: string } {
  const row = rows[i];
  if (!row) return { before: {}, title: "" };
  if (row.action === "publish")
    return { before: row.old_data ?? {}, title: "Thay đổi trên website" };
  for (let j = i + 1; j < rows.length; j++) {
    const prev = rows[j];
    if (prev && prev.content_key === row.content_key)
      return { before: prev.new_data ?? {}, title: "Thay đổi trong bản nháp" };
  }
  if (row.action === "create") return { before: {}, title: "Nội dung ban đầu" };
  return { before: row.old_data ?? {}, title: "So với bản đang hiển thị lúc đó" };
}
