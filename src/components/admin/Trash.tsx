import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOpts = {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
};

/** Promise-based confirm dialog replacing window.confirm. */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});
  const confirm = (o: ConfirmOpts) =>
    new Promise<boolean>((res) => {
      resolver.current = res;
      setOpts(o);
    });
  const close = (v: boolean) => {
    resolver.current(v);
    setOpts(null);
  };
  const dialog = (
    <AlertDialog open={!!opts} onOpenChange={(o) => !o && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {opts?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={
              opts?.destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {opts?.confirmLabel ?? "Xác nhận"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { confirm, dialog };
}

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
      {!q.isLoading && (q.data ?? []).length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Thùng rác trống.
        </p>
      )}
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
          <button
            onClick={() => restore(r.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-primary"
          >
            <RotateCcw className="h-4 w-4" /> Khôi phục
          </button>
          {canHardDelete && (
            <button
              onClick={() => purge(r.id, r[titleCol] ?? "")}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Xóa vĩnh viễn
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
