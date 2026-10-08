import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Activities module (backend tables `activities`, `activity_registrations`). Client-safe types, labels and hooks. */
export type ActivityCategory = "workshop" | "competition" | "camp" | "event" | "community" | "other";
export type LocationType = "online" | "offline" | "hybrid";
export type ManualStatus = "draft" | "published" | "hidden" | "cancelled";
export type LiveStatus = "upcoming" | "ongoing" | "ended" | "cancelled";

export type ActivityRow = {
  id: string; slug: string; title: string; short_description: string; description: string; category: ActivityCategory;
  banner_path: string; start_time: string | null; end_time: string | null; location_type: LocationType; location_detail: string;
  require_registration: boolean; registration_url: string; registration_deadline: string | null; max_participants: number;
  facebook_url: string; website_url: string; auto_status: boolean; manual_status: ManualStatus; deleted_at: string | null;
  created_at: string; banner?: string;
};

export const ACTIVITY_BUCKET = "activity-banners";
export const CATEGORY_LABEL: Record<ActivityCategory | "education", string> = {
  workshop: "Workshop", competition: "Cuộc thi", camp: "Trại / Camp", event: "Sự kiện",
  community: "Hoạt động cộng đồng", education: "Chương trình học", other: "Hoạt động khác",
};
export const LOCATION_LABEL: Record<LocationType, string> = { online: "Online", offline: "Offline", hybrid: "Hybrid" };
export const MANUAL_LABEL: Record<ManualStatus, string> = { draft: "Bản nháp", published: "Đã đăng", hidden: "Tạm ẩn", cancelled: "Đã hủy" };
export const LIVE_LABEL: Record<LiveStatus, { label: string; tone: string }> = {
  upcoming: { label: "Sắp diễn ra", tone: "bg-primary/10 text-primary" },
  ongoing: { label: "Đang diễn ra", tone: "bg-success/15 text-success" },
  ended: { label: "Đã kết thúc", tone: "bg-muted text-muted-foreground" },
  cancelled: { label: "Đã hủy", tone: "bg-destructive/10 text-destructive" },
};
export const REG_STATUS: Record<string, string> = {
  PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối", CANCELLED: "Đã hủy", COMPLETED: "Đã tham gia",
};

export function liveStatus(a: Pick<ActivityRow, "start_time" | "end_time" | "manual_status">, now = Date.now()): LiveStatus {
  if (a.manual_status === "cancelled") return "cancelled";
  const s = a.start_time ? Date.parse(a.start_time) : null;
  const e = a.end_time ? Date.parse(a.end_time) : s;
  if (e !== null && now > e) return "ended";
  if (s !== null && now >= s) return "ongoing";
  return "upcoming";
}

/** Internal registration is open: no external link, required, not ended, before deadline. */
export function registrationOpen(a: ActivityRow, now = Date.now()) {
  if (!a.require_registration || a.registration_url) return false;
  if (liveStatus(a, now) === "ended" || a.manual_status === "cancelled") return false;
  return !a.registration_deadline || now <= Date.parse(a.registration_deadline);
}

export const fmtDateTime = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso)) : "Đang cập nhật";

export async function withBanners(rows: ActivityRow[]): Promise<ActivityRow[]> {
  const paths = rows.map((r) => r.banner_path).filter(Boolean);
  if (!paths.length) return rows;
  const { data } = await supabase.storage.from(ACTIVITY_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, banner: map.get(r.banner_path) ?? "" }));
}

export function usePublicActivities() {
  return useQuery({
    queryKey: ["public-activities"],
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("*").in("manual_status", ["published", "cancelled"]).is("deleted_at", null).order("start_time", { ascending: false, nullsFirst: false });
      return withBanners((data ?? []) as ActivityRow[]);
    },
  });
}

export function usePublicActivity(slug: string) {
  return useQuery({
    queryKey: ["public-activity", slug],
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("*").eq("slug", slug).in("manual_status", ["published", "cancelled"]).is("deleted_at", null).maybeSingle();
      return data ? (await withBanners([data as ActivityRow]))[0] : null;
    },
  });
}
