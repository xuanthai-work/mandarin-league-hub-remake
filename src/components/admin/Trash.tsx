import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useConfirm, type ConfirmOpts } from "@/components/admin/kit/useConfirm";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { Button } from "@/components/ui/button";

export { useConfirm, type ConfirmOpts };

type TrashTable = "news_articles" | "activities" | "courses" | "hsk_classes";
const TITLE: Record<TrashTable, string> = {
  news_articles: "title",
  activities: "title",
  courses: "title",
  hsk_classes: "name",
};

/** Lists soft-deleted rows with restore and (admin-only) permanent delete. */
export function TrashList({
  table,
  canHardDelete,
  invalidate,
}: {
  table: TrashTable;
  canHardDelete: boolean;
  invalidate: string[];
}) {
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const titleCol = TITLE[table];
  const q = useQuery({
    queryKey: ["trash", table],
    queryFn: async () => {
      const { data } = await supabase
        .from(table)
        .select(`id, ${titleCol}, deleted_at`)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      return (data ?? []) as unknown as { id: string; deleted_at: string; [k: string]: string }[];
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["trash", table] });
    invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  const restore = async (id: string) => {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: null } as never)
      .eq("id", id);
    if (error) return void toast.error("Không khôi phục được: " + error.message);
    toast.success("Đã khôi phục");
    refresh();
  };
  const purge = async (id: string, name: string) => {
    if (
      !(await confirm({
        title: "Xóa vĩnh viễn?",
        description: `"${name}" sẽ bị xóa hẳn và không thể khôi phục.`,
        confirmLabel: "Xóa vĩnh viễn",
        destructive: true,
      }))
    )
      return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error)
      return void toast.error(
        error.code === "23503"
          ? "Không thể xóa hẳn vì vẫn còn đơn đăng ký/dữ liệu liên quan. Hãy giữ trong Thùng rác."
          : "Không xóa được: " + error.message,
      );
    toast.success("Đã xóa vĩnh viễn");
    refresh();
  };

  return (
    <div className="space-y-2">
      {dialog}
      <p className="text-sm text-muted-foreground">
        Mục đã xóa nằm ở đây và không hiển thị công khai. Bạn có thể khôi phục bất kỳ lúc nào.
      </p>
      {q.isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
      {!q.isLoading && (q.data ?? []).length === 0 && <EmptyState title="Thùng rác trống." />}
      {(q.data ?? []).map((r) => (
        <div
          key={r.id}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{r[titleCol]}</p>
            <p className="text-xs text-muted-foreground">
              Đã xóa lúc {new Date(r.deleted_at).toLocaleString("vi-VN")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="admin-sm"
            onClick={() => restore(r.id)}
            className="text-primary hover:text-primary"
          >
            <RotateCcw aria-hidden /> Khôi phục
          </Button>
          {canHardDelete && (
            <Button
              type="button"
              variant="destructive-outline"
              size="admin-sm"
              onClick={() => purge(r.id, r[titleCol] ?? "")}
            >
              <Trash2 aria-hidden /> Xóa vĩnh viễn
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
