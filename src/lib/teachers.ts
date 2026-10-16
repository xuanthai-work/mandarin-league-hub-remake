import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TeacherType = "official" | "collaborator" | "guest";
export type TeacherStatus = "draft" | "visible" | "hidden";
export type CourseTeacherRole = "lead" | "instructor" | "assistant" | "guest";

export type PublicTeacher = {
  id: string; full_name: string; chinese_name: string; title: string; avatar_url: string; bio: string; bio_zh: string;
  specialty: string; chinese_level: string; certificates: string; experience: string;
  teaching_levels: number[]; programs: string[]; teacher_type: TeacherType; show_on_home: boolean; is_featured: boolean; sort_order: number;
};

export const TEACHER_BUCKET = "teacher-photos";
export const TEACHER_TYPE_LABEL: Record<TeacherType, string> = { official: "Giáo viên chính thức", collaborator: "Giáo viên cộng tác", guest: "Khách mời giảng dạy" };
export const TEACHER_STATUS_LABEL: Record<TeacherStatus, string> = { draft: "Bản nháp", visible: "Đang hiển thị", hidden: "Đã ẩn" };
export const COURSE_ROLE_LABEL: Record<CourseTeacherRole, string> = { lead: "Giáo viên phụ trách", instructor: "Giáo viên giảng dạy", assistant: "Giáo viên trợ giảng", guest: "Giáo viên khách mời" };
export const PROGRAM_OPTIONS = ["HSKK", "Giao tiếp tiếng Trung", "Luyện thi HSK", "Văn hóa Trung Hoa"];

const PUBLIC_COLS = "id, full_name, chinese_name, title, avatar_url, bio, bio_zh, specialty, chinese_level, certificates, experience, teaching_levels, programs, teacher_type, show_on_home, is_featured, sort_order";

/** avatar_url holds either a storage path (uploaded file) or a legacy https link; returns displayable URLs. */
export async function resolveTeacherPhotos<T extends { avatar_url: string }>(rows: T[]): Promise<(T & { photo?: string })[]> {
  const paths = rows.map((r) => r.avatar_url).filter((p) => p && !/^https?:\/\//.test(p));
  if (!paths.length) return rows.map((r) => ({ ...r, photo: /^https?:\/\//.test(r.avatar_url) ? r.avatar_url : "" }));
  const { data } = await supabase.storage.from(TEACHER_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, photo: map.get(r.avatar_url) ?? (/^https?:\/\//.test(r.avatar_url) ? r.avatar_url : "") }));
}

const withPhoto = async <T extends { avatar_url: string }>(rows: T[]) =>
  (await resolveTeacherPhotos(rows)).map(({ photo, ...r }) => ({ ...r, avatar_url: photo ?? "" }) as unknown as T);

/** Featured first, then admin order. */
export const sortTeachers = <T extends { is_featured: boolean; sort_order: number }>(list: T[]) =>
  [...list].sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order);

/** Publicly visible teachers (status = visible). */
export function usePublicTeachers() {
  return useQuery({
    queryKey: ["public-teachers"],
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select(PUBLIC_COLS).eq("status", "visible").order("sort_order");
      return sortTeachers(await withPhoto((data ?? []) as unknown as PublicTeacher[]));
    },
  });
}

export function usePublicTeacher(id: string) {
  return useQuery({
    queryKey: ["public-teacher", id],
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select(PUBLIC_COLS).eq("id", id).eq("status", "visible").maybeSingle();
      if (!data) return null;
      return (await withPhoto([data as unknown as PublicTeacher]))[0];
    },
  });
}

export type CourseTeacher = { role: CourseTeacherRole; sort_order: number; teacher: PublicTeacher };

/** Teachers assigned to a published program (hidden teachers are dropped by RLS). */
export function useCourseTeachers(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course-teachers", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await supabase.from("course_teachers").select(`role, sort_order, teacher:teachers(${PUBLIC_COLS})`).eq("course_id", courseId!).order("sort_order");
      const rows = ((data ?? []) as unknown as { role: CourseTeacherRole; sort_order: number; teacher: PublicTeacher | null }[]).filter((r) => r.teacher);
      const photos = await withPhoto(rows.map((r) => r.teacher!));
      return rows.map((r, i) => ({ role: r.role, sort_order: r.sort_order, teacher: photos[i] })) as CourseTeacher[];
    },
  });
}

/** Published programs a teacher takes part in. */
export function useTeacherCourses(teacherId: string) {
  return useQuery({
    queryKey: ["teacher-courses", teacherId],
    queryFn: async () => {
      const { data } = await supabase.from("course_teachers").select("role, course:courses(id, slug, title, status, is_published, deleted_at)").eq("teacher_id", teacherId);
      return ((data ?? []) as unknown as { role: CourseTeacherRole; course: { id: string; slug: string; title: string; status: string; is_published: boolean; deleted_at: string | null } | null }[])
        .filter((r) => r.course && r.course.is_published && !r.course.deleted_at)
        .map((r) => ({ role: r.role, ...r.course! }));
    },
  });
}

export const teachersForLevel = <T extends { teaching_levels: number[] }>(list: T[] | undefined, level: number) => (list ?? []).filter((t) => t.teaching_levels.includes(level));

export const teacherTags = (t: Pick<PublicTeacher, "teaching_levels" | "programs">) => [...t.teaching_levels.map((l) => `HSK ${l}`), ...t.programs];
