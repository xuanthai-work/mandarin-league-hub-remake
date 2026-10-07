import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublicTeacher = { id: string; full_name: string; title: string; avatar_url: string; bio: string; teaching_levels: number[] };

/** Visible teachers (RLS hides hidden ones from the public). */
export function usePublicTeachers() {
  return useQuery({
    queryKey: ["public-teachers"],
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select("id, full_name, title, avatar_url, bio, teaching_levels, visible").eq("visible", true).order("sort_order");
      return (data ?? []) as PublicTeacher[];
    },
  });
}

export const teachersForLevel = (list: PublicTeacher[] | undefined, level: number) => (list ?? []).filter((t) => t.teaching_levels.includes(level));
