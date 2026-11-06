import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Per-level teacher assignments only; registration now goes through concrete hsk_classes. */
export type CourseSetting = {
  level: number;
  lead_teacher_id?: string | null;
  co_teacher_ids?: string[];
  assistant_ids?: string[];
};

export const ENROLL_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Đang chờ xét duyệt", tone: "bg-accent text-primary" },
  approved: { label: "Trúng tuyển", tone: "bg-success/15 text-success" },
  rejected: { label: "Chưa phù hợp", tone: "bg-muted text-muted-foreground" },
  cancelled: { label: "Đã hủy", tone: "bg-destructive/10 text-destructive" },
};

export function useCourseSettings() {
  return useQuery({
    queryKey: ["course-settings"],
    queryFn: async () =>
      ((await supabase.from("course_settings").select("*").order("level")).data ??
        []) as CourseSetting[],
  });
}
