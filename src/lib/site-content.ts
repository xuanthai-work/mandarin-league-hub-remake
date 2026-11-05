import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Site-wide settings (footer, contact, social). Empty string = use built-in default. */
export type SiteSettings = {
  email: string;
  facebook: string;
  instagram: string;
  threads: string;
  tiktok: string;
  linkedin: string;
  tagline: string;
  footer_note: string;
};
export const SITE_DEFAULTS: SiteSettings = {
  email: "community@themandarinleague.bond",
  facebook: "https://www.facebook.com/themandarinleague/",
  instagram: "https://www.instagram.com/liendoanhanngu?stkn=MXJzbXhkY3kyNDc2aw==",
  threads: "",
  tiktok: "",
  linkedin: "",
  tagline: "",
  footer_note: "",
};

export const HOME_SECTIONS = {
  about: "Giới thiệu",
  carousel: "Khoảnh khắc TML",
  courses: "Khóa học HSK",
  activities: "Hoạt động tiêu biểu",
  cta: "Kêu gọi tham gia & Liên hệ",
} as const;
export type HomeSectionKey = keyof typeof HOME_SECTIONS;

export type HomeContent = {
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
  cta_title: string;
  cta_body: string;
  show: Record<HomeSectionKey, boolean>;
};
export const HOME_DEFAULTS: HomeContent = {
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
  cta_title: "",
  cta_body: "",
  show: { about: true, carousel: true, courses: true, activities: true, cta: true },
};

export type ContentKey = "site" | "home";
const DEFAULTS = { site: SITE_DEFAULTS, home: HOME_DEFAULTS };

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
  return { data: mergeContent(key, q.data), preview };
}
