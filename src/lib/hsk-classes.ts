import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_BUCKET, type ProgramStatus } from "@/lib/programs";

/** Concrete HSK classes (backend table `hsk_classes`) under fixed levels 1–6. */
export const HSK_LEVELS = [1, 2, 3, 4, 5, 6] as const;
export type HskClass = {
  id: string; level: number; name: string; description: string; thumbnail_path: string; teacher_id: string | null;
  start_date: string | null; end_date: string | null; schedule: string; duration: string; format: string;
  max_students: number; fee_type: "free" | "paid"; fee_amount: number; status: ProgramStatus; registration_url: string;
  is_published: boolean; created_at: string; deleted_at: string | null;
  thumb?: string; seats?: number;
};

export const classFee = (c: Pick<HskClass, "fee_type" | "fee_amount">) =>
  c.fee_type === "free" ? "Miễn phí cộng đồng" : c.fee_amount > 0 ? `${c.fee_amount.toLocaleString("vi-VN")} VNĐ` : "Liên hệ";
export const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");

export async function decorateClasses(rows: HskClass[]): Promise<HskClass[]> {
  const paths = rows.map((r) => r.thumbnail_path).filter(Boolean);
  const map = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from(COURSE_BUCKET).createSignedUrls(paths, 60 * 60 * 6);
    (data ?? []).forEach((d) => { if (d.path) map.set(d.path, d.signedUrl); });
  }
  const seats = await Promise.all(rows.map((r) => supabase.rpc("hsk_class_seats", { _class: r.id })));
  return rows.map((r, i) => ({ ...r, thumb: map.get(r.thumbnail_path) ?? "", seats: (seats[i]?.data as number) ?? 0 }));
}

export function usePublishedClasses() {
  return useQuery({
    queryKey: ["public-hsk-classes"],
    queryFn: async () => {
      const { data } = await supabase.from("hsk_classes").select("*").eq("is_published", true).is("deleted_at", null).order("level").order("start_date");
      return decorateClasses((data ?? []) as HskClass[]);
    },
  });
}
