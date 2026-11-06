import {
  HOME_DEFAULTS,
  SITE_DEFAULTS,
  mergeContent,
  type HomeContent,
  type HomeSectionKey,
  type SiteSettings,
} from "@/lib/site-content";

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

/** text = 1 dòng, area = nhiều dòng, link = "/đường-dẫn" hoặc http(s), url = chỉ http(s), email */
export type FieldKind = "text" | "area" | "link" | "url" | "email";
export type HomeTextKey = Exclude<keyof HomeContent, "show">;
export type SiteKey = keyof SiteSettings;

export type ContentField<K extends string> = {
  key: K;
  label: string;
  kind: FieldKind;
  /** Chữ khách thấy khi ô để trống. "" nghĩa là để trống thì mục đó bị ẩn. */
  fallback: string;
  max: number;
};

export type ContentBlock<K extends string> = {
  id: string;
  label: string;
  /** Khối có công tắc ẩn/hiện (khóa trong HomeContent.show) */
  toggle?: HomeSectionKey;
  /** Khối luôn hiện, không tắt được */
  always?: boolean;
  /** Khối tự hiện theo dữ liệu nơi khác, không có công tắc */
  auto?: boolean;
  /** Dòng giải thích ngắn hiện trong cột phải */
  note?: string;
  /** Khối lấy dữ liệu từ module khác */
  manage?: {
    label: string;
    to: "/admin/photos" | "/admin/courses" | "/admin/teachers" | "/admin/activities";
  };
  fields: ContentField<K>[];
};

const T = 300; // ô 1 dòng
const A = 1000; // ô nhiều dòng

export const HOME_BLOCKS: ContentBlock<HomeTextKey>[] = [
  {
    id: "hero",
    label: "Banner đầu trang",
    always: true,
    fields: [
      {
        key: "hero_badge",
        label: "Dòng nhỏ phía trên",
        kind: "text",
        fallback: "Online Chinese Learning Community",
        max: T,
      },
      {
        key: "hero_title",
        label: "Tiêu đề lớn",
        kind: "text",
        fallback: "The Mandarin League",
        max: T,
      },
      {
        key: "hero_lead",
        label: "Lời dẫn",
        kind: "area",
        fallback:
          "Cộng đồng học tiếng Trung trực tuyến dành cho người Việt – nơi học HSK bài bản, giao lưu văn hóa và cùng nhau phát triển.",
        max: A,
      },
      {
        key: "btn1_label",
        label: "Nút chính – chữ",
        kind: "text",
        fallback: "Tham gia TML",
        max: T,
      },
      {
        key: "btn1_url",
        label: "Nút chính – liên kết",
        kind: "link",
        fallback: "/join",
        max: T,
      },
      {
        key: "btn2_label",
        label: "Nút phụ – chữ",
        kind: "text",
        fallback: "Xem khóa học HSK",
        max: T,
      },
      {
        key: "btn2_url",
        label: "Nút phụ – liên kết",
        kind: "link",
        fallback: "/courses/hsk",
        max: T,
      },
    ],
  },
  {
    id: "about",
    label: "Giới thiệu",
    toggle: "about",
    fields: [
      {
        key: "about_title",
        label: "Tiêu đề",
        kind: "text",
        fallback: "Học tiếng Trung cùng một cộng đồng thực thụ",
        max: T,
      },
      {
        key: "about_p1",
        label: "Đoạn 1",
        kind: "area",
        fallback:
          "The Mandarin League (TML) là tổ chức cộng đồng phi lợi nhuận, quy tụ các bạn trẻ yêu thích tiếng Trung và văn hóa Trung Hoa, hoạt động hoàn toàn trực tuyến.",
        max: A,
      },
      {
        key: "about_p2",
        label: "Đoạn 2",
        kind: "area",
        fallback:
          "Chúng tôi tổ chức khóa học HSK, workshop, cuộc thi và các dự án sáng tạo nội dung, giúp mỗi thành viên vừa học vừa trải nghiệm.",
        max: A,
      },
      {
        key: "stat1_value",
        label: "Số liệu 1 – con số",
        kind: "text",
        fallback: "HSK 1–6",
        max: 40,
      },
      {
        key: "stat1_label",
        label: "Số liệu 1 – chú thích",
        kind: "text",
        fallback: "Lộ trình học bài bản",
        max: 80,
      },
      {
        key: "stat2_value",
        label: "Số liệu 2 – con số",
        kind: "text",
        fallback: "8 Ban",
        max: 40,
      },
      {
        key: "stat2_label",
        label: "Số liệu 2 – chú thích",
        kind: "text",
        fallback: "Chuyên môn hoạt động",
        max: 80,
      },
      {
        key: "stat3_value",
        label: "Số liệu 3 – con số",
        kind: "text",
        fallback: "Hàng tháng",
        max: 40,
      },
      {
        key: "stat3_label",
        label: "Số liệu 3 – chú thích",
        kind: "text",
        fallback: "Workshop & sự kiện",
        max: 80,
      },
    ],
  },
  {
    id: "carousel",
    label: "Khoảnh khắc TML",
    toggle: "carousel",
    note: "Ảnh lấy từ trang Hình ảnh (các ảnh đang bật hiển thị).",
    manage: { label: "Hình ảnh", to: "/admin/photos" },
    fields: [],
  },
  {
    id: "courses",
    label: "Khóa học HSK",
    toggle: "courses",
    note: "Hiện tối đa 4 lớp HSK đang mở đăng ký.",
    manage: { label: "Khóa học", to: "/admin/courses" },
    fields: [],
  },
  {
    id: "faculty",
    label: "Giảng viên",
    auto: true,
    note: "Tự hiện khi có giảng viên được bật “Hiện trên trang chủ” (tối đa 8 người).",
    manage: { label: "Giáo viên", to: "/admin/teachers" },
    fields: [],
  },
  {
    id: "activities",
    label: "Hoạt động tiêu biểu",
    toggle: "activities",
    note: "Hiện 3 hoạt động công khai mới nhất.",
    manage: { label: "Hoạt động", to: "/admin/activities" },
    fields: [],
  },
  {
    id: "cta",
    label: "Kêu gọi tham gia & Liên hệ",
    toggle: "cta",
    fields: [
      {
        key: "cta_title",
        label: "Tiêu đề",
        kind: "text",
        fallback: "Sẵn sàng trở thành một phần của TML?",
        max: T,
      },
      {
        key: "cta_body",
        label: "Lời dẫn",
        kind: "area",
        fallback:
          "Ứng tuyển vào một trong 8 Ban, học hỏi kỹ năng mới và cùng lan tỏa tình yêu tiếng Trung.",
        max: A,
      },
    ],
  },
];

export const SITE_BLOCKS: ContentBlock<SiteKey>[] = [
  {
    id: "contact",
    label: "Liên hệ & Mạng xã hội",
    fields: [
      {
        key: "email",
        label: "Email liên hệ",
        kind: "email",
        fallback: SITE_DEFAULTS.email,
        max: T,
      },
      {
        key: "facebook",
        label: "Facebook",
        kind: "url",
        fallback: SITE_DEFAULTS.facebook,
        max: T,
      },
      {
        key: "instagram",
        label: "Instagram",
        kind: "url",
        fallback: SITE_DEFAULTS.instagram,
        max: T,
      },
      { key: "threads", label: "Threads", kind: "url", fallback: "", max: T },
      { key: "tiktok", label: "TikTok", kind: "url", fallback: "", max: T },
      { key: "linkedin", label: "LinkedIn", kind: "url", fallback: "", max: T },
    ],
  },
  {
    id: "footer",
    label: "Chân trang",
    fields: [
      {
        key: "tagline",
        label: "Mô tả ngắn về TML",
        kind: "area",
        fallback: "Kết nối người học, nhà giáo dục và cơ hội giữa Việt Nam và Trung Quốc.",
        max: A,
      },
      {
        key: "footer_note",
        label: "Dòng bản quyền",
        kind: "text",
        fallback: "The Mandarin League. All rights reserved.",
        max: T,
      },
    ],
  },
];

/** Trả về câu lỗi tiếng Việt, hoặc null nếu hợp lệ. Ô trống luôn hợp lệ. */
export function fieldError(kind: FieldKind, value: string): string | null {
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
    case "text":
    case "area":
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

/** So hai bản (draft/published/old_data/new_data thô), trả danh sách thay đổi theo thứ tự khối/ô trên màn. */
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
  const blocks = (key === "home" ? HOME_BLOCKS : SITE_BLOCKS) as ContentBlock<string>[];
  const out: FieldChange[] = [];
  for (const blk of blocks) {
    if (blk.toggle && changed.has(`show.${blk.toggle}`)) {
      const sa = (a["show"] as Record<string, boolean> | undefined)?.[blk.toggle];
      const sb = (b["show"] as Record<string, boolean> | undefined)?.[blk.toggle];
      out.push({
        id: `show.${blk.toggle}`,
        block: blk.label,
        label: "Hiển thị trên trang chủ",
        before: sa ? "Hiện" : "Ẩn",
        after: sb ? "Hiện" : "Ẩn",
        beforeDefault: false,
        afterDefault: false,
      });
    }
    for (const f of blk.fields) {
      if (!changed.has(f.key)) continue;
      const va = String(a[f.key] ?? "").trim();
      const vb = String(b[f.key] ?? "").trim();
      out.push({
        id: f.key,
        block: blk.label,
        label: f.label,
        before: va || f.fallback || EMPTY_HIDDEN,
        after: vb || f.fallback || EMPTY_HIDDEN,
        beforeDefault: !va,
        afterDefault: !vb,
      });
    }
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
