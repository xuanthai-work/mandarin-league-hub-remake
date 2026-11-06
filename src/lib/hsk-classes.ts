import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_BUCKET, type ProgramStatus } from "@/lib/programs";
import { matchesSearch } from "@/lib/search";

/** Concrete HSK classes (backend table `hsk_classes`) under fixed levels 1–6. */
export const HSK_LEVELS = [1, 2, 3, 4, 5, 6] as const;
export type HskClass = {
  id: string;
  level: number;
  name: string;
  description: string;
  thumbnail_path: string;
  teacher_id: string | null;
  start_date: string | null;
  end_date: string | null;
  schedule: string;
  duration: string;
  format: string;
  max_students: number;
  fee_type: "free" | "paid";
  fee_amount: number;
  status: ProgramStatus;
  registration_url: string;
  is_published: boolean;
  created_at: string;
  deleted_at: string | null;
  thumb?: string;
  seats?: number;
};

export const classFee = (c: Pick<HskClass, "fee_type" | "fee_amount">) =>
  c.fee_type === "free"
    ? "Miễn phí cộng đồng"
    : c.fee_amount > 0
      ? `${c.fee_amount.toLocaleString("vi-VN")} VNĐ`
      : "Liên hệ";
export const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");

export async function decorateClasses(
  rows: HskClass[],
  opts: { seats?: boolean } = {},
): Promise<HskClass[]> {
  const paths = rows.map((r) => r.thumbnail_path).filter(Boolean);
  const map = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage
      .from(COURSE_BUCKET)
      .createSignedUrls(paths, 60 * 60 * 6);
    (data ?? []).forEach((d) => {
      if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
    });
  }
  const withSeats = opts.seats !== false;
  const seats = withSeats
    ? await Promise.all(rows.map((r) => supabase.rpc("hsk_class_seats", { _class: r.id })))
    : [];
  return rows.map((r, i) => {
    const base = { ...r, thumb: map.get(r.thumbnail_path) ?? "" };
    return withSeats ? { ...base, seats: (seats[i]?.data as number) ?? 0 } : base;
  });
}

export type ClassStatusFilter = "open" | "enrolling" | "upcoming" | "ongoing" | "ended" | "all";

/** "open" = mọi trạng thái trừ "ended" (mặc định của màn admin). */
export function filterClasses(
  rows: HskClass[],
  f: {
    level: number;
    status: ClassStatusFilter;
    q: string;
    teacherName: (id: string | null) => string;
  },
): HskClass[] {
  const byStart = (a: HskClass, b: HskClass) => {
    if (!a.start_date && !b.start_date) return 0;
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return b.start_date.localeCompare(a.start_date);
  };
  return rows
    .filter((c) => f.level === 0 || c.level === f.level)
    .filter((c) => {
      if (f.status === "all") return true;
      if (f.status === "open") return c.status !== "ended";
      return c.status === f.status;
    })
    .filter((c) => matchesSearch(`${c.name} ${f.teacherName(c.teacher_id)}`, f.q))
    .sort((a, b) => a.level - b.level || byStart(a, b));
}

/** Đơn "approved" theo lớp: dùng ở admin thay cho N lệnh RPC hsk_class_seats. */
export function countApprovedByClass(
  rows: { hsk_class_id: string | null; status: string }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.status !== "approved" || !r.hsk_class_id) continue;
    counts.set(r.hsk_class_id, (counts.get(r.hsk_class_id) ?? 0) + 1);
  }
  return counts;
}

export function usePublishedClasses() {
  return useQuery({
    queryKey: ["public-hsk-classes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hsk_classes")
        .select("*")
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("level")
        .order("start_date");
      return decorateClasses((data ?? []) as HskClass[]);
    },
  });
}
