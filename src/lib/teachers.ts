import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublicTeacher = { id: string; full_name: string; title: string; avatar_url: string; bio: string; teaching_levels: number[] };

export const TEACHER_BUCKET = "teacher-photos";

/** avatar_url holds either a storage path (uploaded file) or a legacy https link; returns displayable URLs. */
export async function resolveTeacherPhotos<T extends { avatar_url: string }>(rows: T[]): Promise<T[]> {
  const paths = rows.map((r) => r.avatar_url).filter((p) => p && !/^https?:\/\//.test(p));
  if (!paths.length) return rows;
  const { data } = await supabase.storage.from(TEACHER_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, photo: map.get(r.avatar_url) ?? (/^https?:\/\//.test(r.avatar_url) ? r.avatar_url : "") }));
}

/** Visible teachers (RLS hides hidden ones from the public). */
export function usePublicTeachers() {
  return useQuery({
    queryKey: ["public-teachers"],
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select("id, full_name, title, avatar_url, bio, teaching_levels, visible").eq("visible", true).order("sort_order");
      const rows = await resolveTeacherPhotos((data ?? []) as PublicTeacher[]);
      return rows.map((r) => ({ ...r, avatar_url: (r as PublicTeacher & { photo?: string }).photo ?? "" })) as PublicTeacher[];
    },
  });
}

export const teachersForLevel = (list: PublicTeacher[] | undefined, level: number) => (list ?? []).filter((t) => t.teaching_levels.includes(level));
