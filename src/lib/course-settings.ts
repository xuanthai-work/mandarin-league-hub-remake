import { useQuery } from "@tanstack/react-query";
import type { StatusTone } from "@/components/admin/kit/StatusPill";
import { supabase } from "@/integrations/supabase/client";

/** Per-level teacher assignments only; registration now goes through concrete hsk_classes. */
export type CourseSetting = {
  level: number;
  lead_teacher_id?: string | null;
  co_teacher_ids?: string[];
  assistant_ids?: string[];
};

export const ENROLL_STATUS: Record<string, { label: string }> = {
  pending: { label: "Đang chờ xét duyệt" },
  approved: { label: "Trúng tuyển" },
  rejected: { label: "Chưa phù hợp" },
  cancelled: { label: "Đã hủy" },
};

export const ENROLL_STATUS_TONE: Record<string, StatusTone> = {
  pending: "info",
  approved: "success",
  rejected: "neutral",
  cancelled: "danger",
};

export function useCourseSettings() {
  return useQuery({
    queryKey: ["course-settings"],
    queryFn: async () =>
      ((await supabase.from("course_settings").select("*").order("level")).data ??
        []) as CourseSetting[],
  });
}
