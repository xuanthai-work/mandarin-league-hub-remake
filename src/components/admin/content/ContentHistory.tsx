import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { RotateCcw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentDiffList } from "@/components/admin/content/ContentDiffList";
import { auditBaseline, describeChanges, type FieldChange } from "@/lib/site-content-fields";

export interface ContentHistoryProps {
  onRestore: (key: "home" | "site", data: unknown) => void;
}

type AuditLogRow = {
  id: string;
  created_at: string;
  content_key: string;
  action: string;
  actor_name: string | null;
  old_data: unknown;
  new_data: unknown;
};

type EnrichedRow = {
  row: AuditLogRow;
  index: number;
  baseline: { before: unknown; title: string };
  changes: FieldChange[];
};

const ACTION_LABEL: Record<string, string> = {
  publish: "Xuất bản",
  save_draft: "Lưu nháp",
  create: "Tạo mới",
};

const KEY_LABEL: Record<string, string> = {
  home: "Trang chủ",
  site: "Liên hệ & Chân trang",
};

export function ContentHistory({ onRestore }: ContentHistoryProps) {
  const [filter, setFilter] = useState<"all" | "home" | "site">("all");
  const [selectedItem, setSelectedItem] = useState<EnrichedRow | null>(null);

  const q = useQuery({
    queryKey: ["content-audit"],
    queryFn: async () =>
      (
        await supabase
          .from("content_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
      ).data ?? [],
  });

  const enrichedRows = useMemo(() => {
    const rawRows = (q.data ?? []) as AuditLogRow[];
    return rawRows
      .map((row, index) => {
        if (row.content_key !== "home" && row.content_key !== "site") return null;
        const baseline = auditBaseline(rawRows, index);
        const changes = describeChanges(
          row.content_key as "home" | "site",
          baseline.before,
          row.new_data,
        );
        return { row, index, baseline, changes };
      })
      .filter((item): item is EnrichedRow => item !== null);
  }, [q.data]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return enrichedRows;
    return enrichedRows.filter((item) => item.row.content_key === filter);
  }, [enrichedRows, filter]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedItem(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-between gap-2">
        <div className="w-52">
          <Select value={filter} onValueChange={(v) => setFilter(v as "all" | "home" | "site")}>
            <SelectTrigger className="w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mục</SelectItem>
              <SelectItem value="home">Trang chủ</SelectItem>
              <SelectItem value="site">Liên hệ & Chân trang</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-border/60 bg-secondary/30 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-semibold">Thời gian</th>
              <th className="p-3 font-semibold">Mục</th>
              <th className="p-3 font-semibold">Thao tác</th>
              <th className="p-3 font-semibold">Người thực hiện</th>
              <th className="p-3 font-semibold">Thay đổi</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Đang tải…
                </td>
              </tr>
            )}

            {!q.isLoading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Chưa có thay đổi.
                </td>
              </tr>
            )}

            {!q.isLoading &&
              filteredRows.map((item) => {
                const { row, changes } = item;
                const isPublish = row.action === "publish";

                return (
                  <tr
                    key={row.id}
                    tabIndex={0}
                    onClick={() => setSelectedItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if (e.key === " ") e.preventDefault();
                        setSelectedItem(item);
                      }
                    }}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  >
                    <td className="p-3 text-xs tabular-nums text-muted-foreground">
                      {new Date(row.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-3 font-medium text-foreground">
                      {KEY_LABEL[row.content_key] ?? row.content_key}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          isPublish
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ACTION_LABEL[row.action] ?? row.action}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{row.actor_name || "—"}</td>
                    <td className="p-3 text-foreground tabular-nums">
                      {changes.length > 0 ? `${changes.length} ô` : "—"}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setSelectedItem(null)}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Chi tiết thay đổi"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="relative z-10 flex h-full w-full max-w-[580px] flex-col border-l border-border bg-card shadow-2xl"
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-foreground">Chi tiết thay đổi</h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        selectedItem.row.action === "publish"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ACTION_LABEL[selectedItem.row.action] ?? selectedItem.row.action}
                    </span>
                    <span>·</span>
                    <span>
                      {KEY_LABEL[selectedItem.row.content_key] ?? selectedItem.row.content_key}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums">
                      {new Date(selectedItem.row.created_at).toLocaleString("vi-VN")}
                    </span>
                    <span>·</span>
                    <span>{selectedItem.row.actor_name || "—"}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelectedItem(null)}
                  aria-label="Đóng"
                  className="rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {selectedItem.baseline.title}
                </h3>
                <ContentDiffList changes={selectedItem.changes} />
              </div>

              <div className="border-t border-border/70 px-6 py-4 space-y-2">
                <Button
                  className="w-full"
                  disabled={!selectedItem.row.new_data}
                  onClick={() => {
                    onRestore(
                      selectedItem.row.content_key as "home" | "site",
                      selectedItem.row.new_data,
                    );
                    setSelectedItem(null);
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Nạp bản này vào trình sửa
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Chỉ nạp vào ô sửa, chưa lưu. Kiểm tra lại rồi bấm Lưu nháp hoặc Xuất bản.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
