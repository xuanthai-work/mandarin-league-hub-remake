import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Program catalog (backend table `courses`). Client-safe shared types/labels/hooks. */
export type CourseType = "FREE_COMMUNITY" | "PAID" | "SPECIAL_PROGRAM";
export type ProgramStatus = "enrolling" | "upcoming" | "ongoing" | "ended";
export type Program = {
  id: string; title: string; slug: string; short_description: string; description: string; thumbnail_path: string;
  level: string; course_type: CourseType; teacher_id: string | null; duration: string; schedule: string; format: string;
  price: number; capacity: number; facebook_url: string; registration_url: string; website_url: string;
  status: ProgramStatus; is_published: boolean; created_by: string | null; created_at: string; deleted_at: string | null;
  thumb?: string;
};

export const COURSE_BUCKET = "course-thumbnails";
export const TYPE_LABEL: Record<CourseType, { label: string; tone: string }> = {
  FREE_COMMUNITY: { label: "Miễn phí cộng đồng", tone: "bg-success/15 text-success" },
  PAID: { label: "Khóa học chuyên sâu", tone: "bg-primary/10 text-primary" },
  SPECIAL_PROGRAM: { label: "Chương trình đặc biệt", tone: "bg-gold/20 text-primary-deep" },
};
export const STATUS_LABEL: Record<ProgramStatus, string> = {
  enrolling: "Đang tuyển sinh", upcoming: "Sắp mở", ongoing: "Đang diễn ra", ended: "Đã kết thúc",
};

export const programFee = (p: Pick<Program, "course_type" | "price">) =>
  p.course_type === "FREE_COMMUNITY" ? "Miễn phí cộng đồng" : p.price > 0 ? `${p.price.toLocaleString("vi-VN")} VNĐ` : "Liên hệ";

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export async function withThumbs(rows: Program[]): Promise<Program[]> {
  const paths = rows.map((r) => r.thumbnail_path).filter(Boolean);
  if (!paths.length) return rows;
  const { data } = await supabase.storage.from(COURSE_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, thumb: map.get(r.thumbnail_path) ?? "" }));
}

/** Published programs only (RLS also enforces this for the public). */
export function usePublishedPrograms() {
  return useQuery({
    queryKey: ["public-programs"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("is_published", true).is("deleted_at", null).order("created_at", { ascending: false });
      return withThumbs((data ?? []) as Program[]);
    },
  });
}

export function useProgram(slug: string) {
  return useQuery({
    queryKey: ["public-program", slug],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("slug", slug).eq("is_published", true).is("deleted_at", null).maybeSingle();
      return data ? (await withThumbs([data as Program]))[0] : null;
    },
  });
}
