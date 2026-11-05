import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const NEWS_BUCKET = "news-covers";
export const PARTNER_BUCKET = "partner-logos";

export type NewsStatus = "draft" | "pending_review" | "needs_revision" | "published" | "archived";
export const NEWS_STATUS_LABEL: Record<NewsStatus, string> = {
  draft: "Nháp",
  pending_review: "Chờ duyệt",
  needs_revision: "Cần chỉnh sửa",
  published: "Đã xuất bản",
  archived: "Lưu trữ",
};

export type NewsRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  cover_path: string;
  author_id: string | null;
  author_name: string;
  status: NewsStatus;
  review_note: string;
  reviewer_name: string;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  cover?: string;
};

export type PartnerRow = {
  id: string;
  name: string;
  category: string;
  field: string;
  description: string;
  logo_path: string;
  website_url: string;
  sort_order: number;
  is_active: boolean;
  logo?: string;
};

async function sign<T>(
  bucket: "news-covers" | "partner-logos",
  rows: T[],
  key: keyof T,
  out: string,
): Promise<T[]> {
  const paths = rows.map((r) => r[key] as unknown as string).filter(Boolean);
  if (!paths.length) return rows;
  const { signImages } = await import("./public-images.functions");
  const m = await signImages(bucket, paths);
  return rows.map((r) => ({ ...r, [out]: m.get(r[key] as unknown as string) ?? "" }));
}
export const withCovers = (rows: NewsRow[]) => sign(NEWS_BUCKET, rows, "cover_path", "cover");
export const withLogos = (rows: PartnerRow[]) => sign(PARTNER_BUCKET, rows, "logo_path", "logo");

export function usePublishedNews() {
  return useQuery({
    queryKey: ["public-news"],
    queryFn: async () => {
      const { data } = await supabase
        .from("news_articles")
        .select("*")
        .eq("status", "published")
        .is("deleted_at", null)
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false });
      return withCovers((data ?? []) as NewsRow[]);
    },
  });
}

export function usePublishedArticle(slug: string) {
  return useQuery({
    queryKey: ["public-news", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("news_articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      return data ? (await withCovers([data as NewsRow]))[0] : null;
    },
  });
}

export function useActivePartners() {
  return useQuery({
    queryKey: ["public-partners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("*")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order")
        .order("name");
      return withLogos((data ?? []) as PartnerRow[]);
    },
  });
}

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("vi-VN") : "";
