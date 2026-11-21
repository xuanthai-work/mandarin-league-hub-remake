import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang, type Lang } from "@/lib/i18n";

/** Text fields admins can customize per language (vi / en / zh). */
export const HOME_TEXT_KEYS = [
  "hero_badge",
  "hero_title",
  "hero_lead",
  "btn1_label",
  "btn2_label",
  "about_title",
  "about_p1",
  "about_p2",
  "stat1_value",
  "stat1_label",
  "stat2_value",
  "stat2_label",
  "stat3_value",
  "stat3_label",
  "about_cta_label",
  "about_page_title",
  "about_page_desc",
  "about_page_intro_label",
  "about_page_intro_title",
  "about_page_intro_body",
  "about_page_mission_label",
  "about_page_mission",
  "about_page_vision_label",
  "about_page_vision",
  "about_page_values_title",
  "about_page_steps_title",
  "about_page_programs_title",
  "values_title",
  "values_lead",
  "value1_title",
  "value1_desc",
  "value2_title",
  "value2_desc",
  "value3_title",
  "value3_desc",
  "value4_title",
  "value4_desc",
  "community_title",
  "community_desc",
  "community_cta_label",
  "organization_title",
  "organization_desc",
  "organization_cta_label",
  "community_page_title",
  "community_page_desc",
  "community_page_eyebrow",
  "community_opportunities_title",
  "partners_page_title",
  "partners_page_desc",
  "organization_page_title",
  "organization_page_desc",
  "courses_title",
  "courses_lead",
  "courses_cta_label",
  "courses_page_title",
  "courses_page_desc",
  "hsk_page_title",
  "hsk_page_desc",
  "teachers_section_title",
  "teachers_section_desc",
  "teachers_cta_label",
  "teachers_page_title",
  "teachers_page_desc",
  "activities_title",
  "activities_lead",
  "activities_cta_label",
  "activities_page_title",
  "activities_page_desc",
  "news_section_title",
  "news_section_desc",
  "news_cta_label",
  "news_page_title",
  "news_page_desc",
  "partners_section_title",
  "partners_section_desc",
  "partners_cta_label",
  "verify_page_title",
  "verify_page_desc",
  "verify_cert_card_title",
  "verify_cert_card_desc",
  "verify_cert_cta_label",
  "verify_certificate_title",
  "verify_certificate_desc",
  "verify_hsk_card_title",
  "verify_hsk_card_desc",
  "verify_hsk_cta_label",
  "verify_hsk_title",
  "verify_hsk_desc",
  "join_page_title",
  "join_page_desc",
  "contact_page_title",
  "contact_page_desc",
  "cta_title",
  "cta_body",
  "cta_button_label",
] as const;
export type HomeTextFieldKey = (typeof HOME_TEXT_KEYS)[number];

export const SITE_TEXT_KEYS = ["tagline", "footer_note"] as const;
export type SiteTextFieldKey = (typeof SITE_TEXT_KEYS)[number];

/** Flattened translations keep the existing JSON backwards compatible. */
type Translations<T extends string> = {
  [K in T as `${K}_en` | `${K}_zh`]: string;
};

function blankTranslations<T extends string>(keys: readonly T[]): Translations<T> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    out[`${key}_en`] = "";
    out[`${key}_zh`] = "";
  }
  return out as Translations<T>;
}

/** Site-wide settings (footer, contact, social). Empty string = use built-in default. */
type SiteSettingsBase = {
  email: string;
  facebook: string;
  instagram: string;
  threads: string;
  tiktok: string;
  linkedin: string;
  tagline: string;
  footer_note: string;
};
export type SiteSettings = SiteSettingsBase & Translations<SiteTextFieldKey>;
export const SITE_DEFAULTS: SiteSettings = {
  ...blankTranslations(SITE_TEXT_KEYS),
  email: "community@themandarinleague.bond",
  facebook: "https://www.facebook.com/themandarinleague/",
  instagram: "https://www.instagram.com/liendoanhanngu?stkn=MXJzbXhkY3kyNDc2aw==",
  threads: "",
  tiktok: "",
  linkedin: "",
  tagline: "",
  footer_note: "",
};

const HOME_SECTIONS = {
  about: "Giới thiệu",
  carousel: "Khoảnh khắc TML",
  courses: "Khóa học HSK",
  activities: "Hoạt động tiêu biểu",
  cta: "Kêu gọi tham gia & Liên hệ",
} as const;
export type HomeSectionKey = keyof typeof HOME_SECTIONS;

type HomeContentBase = {
  hero_badge: string;
  hero_title: string;
  hero_lead: string;
  btn1_label: string;
  btn1_url: string;
  btn2_label: string;
  btn2_url: string;
  about_title: string;
  about_p1: string;
  about_p2: string;
  stat1_value: string;
  stat1_label: string;
  stat2_value: string;
  stat2_label: string;
  stat3_value: string;
  stat3_label: string;
  about_cta_label: string;
  about_cta_url: string;
  about_page_title: string;
  about_page_desc: string;
  about_page_intro_label: string;
  about_page_intro_title: string;
  about_page_intro_body: string;
  about_page_mission_label: string;
  about_page_mission: string;
  about_page_vision_label: string;
  about_page_vision: string;
  about_page_values_title: string;
  about_page_steps_title: string;
  about_page_programs_title: string;
  values_title: string;
  values_lead: string;
  value1_title: string;
  value1_desc: string;
  value2_title: string;
  value2_desc: string;
  value3_title: string;
  value3_desc: string;
  value4_title: string;
  value4_desc: string;
  community_title: string;
  community_desc: string;
  community_cta_label: string;
  community_cta_url: string;
  community_page_title: string;
  community_page_desc: string;
  community_page_eyebrow: string;
  community_opportunities_title: string;
  partners_page_title: string;
  partners_page_desc: string;
  organization_title: string;
  organization_desc: string;
  organization_cta_label: string;
  organization_cta_url: string;
  organization_page_title: string;
  organization_page_desc: string;
  courses_title: string;
  courses_lead: string;
  courses_cta_label: string;
  courses_cta_url: string;
  courses_page_title: string;
  courses_page_desc: string;
  hsk_page_title: string;
  hsk_page_desc: string;
  teachers_section_title: string;
  teachers_section_desc: string;
  teachers_cta_label: string;
  teachers_cta_url: string;
  teachers_page_title: string;
  teachers_page_desc: string;
  activities_title: string;
  activities_lead: string;
  activities_cta_label: string;
  activities_cta_url: string;
  activities_page_title: string;
  activities_page_desc: string;
  news_section_title: string;
  news_section_desc: string;
  news_cta_label: string;
  news_cta_url: string;
  news_page_title: string;
  news_page_desc: string;
  partners_section_title: string;
  partners_section_desc: string;
  partners_cta_label: string;
  partners_cta_url: string;
  verify_page_title: string;
  verify_page_desc: string;
  verify_cert_card_title: string;
  verify_cert_card_desc: string;
  verify_cert_cta_label: string;
  verify_cert_cta_url: string;
  verify_certificate_title: string;
  verify_certificate_desc: string;
  verify_hsk_card_title: string;
  verify_hsk_card_desc: string;
  verify_hsk_cta_label: string;
  verify_hsk_cta_url: string;
  verify_hsk_title: string;
  verify_hsk_desc: string;
  join_page_title: string;
  join_page_desc: string;
  contact_page_title: string;
  contact_page_desc: string;
  cta_title: string;
  cta_body: string;
  cta_button_label: string;
  cta_button_url: string;
  show: Record<HomeSectionKey, boolean>;
};
export type HomeContent = HomeContentBase & Translations<HomeTextFieldKey>;
export const HOME_DEFAULTS: HomeContent = {
  ...blankTranslations(HOME_TEXT_KEYS),
  hero_badge: "",
  hero_title: "",
  hero_lead: "",
  btn1_label: "",
  btn1_url: "",
  btn2_label: "",
  btn2_url: "",
  about_title: "",
  about_p1: "",
  about_p2: "",
  stat1_value: "",
  stat1_label: "",
  stat2_value: "",
  stat2_label: "",
  stat3_value: "",
  stat3_label: "",
  about_cta_label: "",
  about_cta_url: "",
  about_page_title: "",
  about_page_desc: "",
  about_page_intro_label: "",
  about_page_intro_title: "",
  about_page_intro_body: "",
  about_page_mission_label: "",
  about_page_mission: "",
  about_page_vision_label: "",
  about_page_vision: "",
  about_page_values_title: "",
  about_page_steps_title: "",
  about_page_programs_title: "",
  values_title: "",
  values_lead: "",
  value1_title: "",
  value1_desc: "",
  value2_title: "",
  value2_desc: "",
  value3_title: "",
  value3_desc: "",
  value4_title: "",
  value4_desc: "",
  community_title: "",
  community_desc: "",
  community_cta_label: "",
  community_cta_url: "",
  community_page_title: "",
  community_page_desc: "",
  community_page_eyebrow: "",
  community_opportunities_title: "",
  partners_page_title: "",
  partners_page_desc: "",
  organization_title: "",
  organization_desc: "",
  organization_cta_label: "",
  organization_cta_url: "",
  organization_page_title: "",
  organization_page_desc: "",
  courses_title: "",
  courses_lead: "",
  courses_cta_label: "",
  courses_cta_url: "",
  courses_page_title: "",
  courses_page_desc: "",
  hsk_page_title: "",
  hsk_page_desc: "",
  teachers_section_title: "",
  teachers_section_desc: "",
  teachers_cta_label: "",
  teachers_cta_url: "",
  teachers_page_title: "",
  teachers_page_desc: "",
  activities_title: "",
  activities_lead: "",
  activities_cta_label: "",
  activities_cta_url: "",
  activities_page_title: "",
  activities_page_desc: "",
  news_section_title: "",
  news_section_desc: "",
  news_cta_label: "",
  news_cta_url: "",
  news_page_title: "",
  news_page_desc: "",
  partners_section_title: "",
  partners_section_desc: "",
  partners_cta_label: "",
  partners_cta_url: "",
  verify_page_title: "",
  verify_page_desc: "",
  verify_cert_card_title: "",
  verify_cert_card_desc: "",
  verify_cert_cta_label: "",
  verify_cert_cta_url: "",
  verify_certificate_title: "",
  verify_certificate_desc: "",
  verify_hsk_card_title: "",
  verify_hsk_card_desc: "",
  verify_hsk_cta_label: "",
  verify_hsk_cta_url: "",
  verify_hsk_title: "",
  verify_hsk_desc: "",
  join_page_title: "",
  join_page_desc: "",
  contact_page_title: "",
  contact_page_desc: "",
  cta_title: "",
  cta_body: "",
  cta_button_label: "",
  cta_button_url: "",
  show: { about: true, carousel: true, courses: true, activities: true, cta: true },
};

export type ContentKey = "site" | "home";
const DEFAULTS = { site: SITE_DEFAULTS, home: HOME_DEFAULTS };

const LANG_SUFFIX: Record<Lang, "" | "_en" | "_zh"> = { vi: "", en: "_en", zh: "_zh" };

/**
 * Custom text is stored per language as `field`, `field_en`, `field_zh`.
 * Visitors get the localized custom text; blank fields fall back to the
 * translated defaults inside the components. Shared settings (links, socials,
 * visibility) stay identical for every language.
 */
export function localizeContent<K extends ContentKey>(
  key: K,
  data: (typeof DEFAULTS)[K],
  lang: Lang,
): (typeof DEFAULTS)[K] {
  if (lang === "vi") return data;
  const suffix = LANG_SUFFIX[lang];
  const out = { ...data } as Record<string, unknown>;
  const textKeys = key === "home" ? HOME_TEXT_KEYS : SITE_TEXT_KEYS;
  for (const base of textKeys) {
    out[base] = (data as unknown as Record<string, unknown>)[`${base}${suffix}`] ?? "";
  }
  return out as (typeof DEFAULTS)[K];
}

/** Merge stored JSON over defaults so missing/blank fields never break the layout. */
export function mergeContent<K extends ContentKey>(key: K, raw: unknown): (typeof DEFAULTS)[K] {
  const base = DEFAULTS[key] as Record<string, unknown>;
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(base)) {
    if (k === "show")
      out["show"] = { ...(base["show"] as object), ...((src["show"] as object) ?? {}) };
    else if (typeof src[k] === "string" && (src[k] as string).trim())
      out[k] = (src[k] as string).trim();
  }
  return out as (typeof DEFAULTS)[K];
}

/** Published content for visitors; signed-in staff see the draft when the URL has ?preview=1. */
export function usePreviewMode(): boolean {
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    setPreview(new URLSearchParams(window.location.search).get("preview") === "1");
  }, []);
  return preview;
}

/** Giữ ?preview=1 khi CTA điều hướng nội bộ, để trang đích cũng mở bản nháp. */
export function appendPreview(url: string, preview: boolean): string {
  if (!preview || !url.startsWith("/") || url.startsWith("//")) return url;
  const [base = "", hash] = url.split("#");
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}preview=1${hash ? `#${hash}` : ""}`;
}

export function useSiteContent<K extends ContentKey>(key: K) {
  const lang = useLang();
  const preview = usePreviewMode();
  const q = useQuery({
    queryKey: ["site-content", key, preview],
    staleTime: 60_000,
    queryFn: async () => {
      if (preview) {
        const { data } = await supabase
          .from("site_content")
          .select("draft")
          .eq("key", key)
          .maybeSingle();
        if (data) return data.draft;
      }
      const { data } = await supabase
        .from("site_content")
        .select("published")
        .eq("key", key)
        .maybeSingle();
      return data?.published ?? {};
    },
  });
  return { data: localizeContent(key, mergeContent(key, q.data), lang), preview };
}
