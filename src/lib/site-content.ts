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
  "cta_title",
  "cta_body",
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
  cta_title: string;
  cta_body: string;
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
  cta_title: "",
  cta_body: "",
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
export function useSiteContent<K extends ContentKey>(key: K) {
  const lang = useLang();
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    setPreview(new URLSearchParams(window.location.search).get("preview") === "1");
  }, []);
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
