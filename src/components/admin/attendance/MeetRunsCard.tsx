import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, History, Loader2, Play, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";

import { AdminModal } from "@/components/admin/kit/AdminModal";
import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { rescoreMeetConference, scanMeetNow } from "@/lib/meet-auto.functions";
import type { AutoResult } from "@/lib/meet-auto.server";

type MeetAutoRunRow = Database["public"]["Tables"]["meet_auto_runs"]["Row"] & {
  meeting_rooms?: {
    label: string;
    kind: string;
    department: string | null;
  } | null;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; tone: "success" | "neutral" | "warning" | "danger" | "info" }
> = {
  scored: { label: "Đã chấm", tone: "success" },
  too_short: { label: "Quá ngắn", tone: "neutral" },
  no_members: { label: "Không ai khớp", tone: "warning" },
  unknown_room: { label: "Phòng lạ", tone: "warning" },
  error: { label: "Lỗi", tone: "danger" },
  running: { label: "Đang xử lý", tone: "info" },
};

function isMissingTableError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  return code === "42P01" || (msg.includes("relation") && msg.includes("does not exist"));
}

function formatVietnamDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function MeetRunsCard({ canManage }: { canManage: boolean }) {
  const scanFn = useServerFn(scanMeetNow);
  const rescoreFn = useServerFn(rescoreMeetConference);

  const [scanning, setScanning] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [rescoringRecord, setRescoringRecord] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewResults, setPreviewResults] = useState<AutoResult[]>([]);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["admin", "meet_auto_runs"],
    queryFn: async () => {
      const { data: runs, error: queryError } = await supabase
        .from("meet_auto_runs")
        .select("*, meeting_rooms(label, kind, department)")
        .order("meeting_start", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (queryError) throw queryError;
      return (runs ?? []) as unknown as MeetAutoRunRow[];
    },
  });

  const handleScanNow = async () => {
    setScanning(true);
    try {
      const results = await scanFn({ data: {} });
      const scored = results.filter((r) => r.status === "scored").length;
      const errors = results.filter((r) => r.status === "error").length;
      const skipped = results.filter((r) => r.status === "skipped").length;
      toast.success(
        `Đã quét ${results.length} buổi họp: chấm ${scored}, bỏ qua ${skipped}, lỗi ${errors}.`,
      );
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Quét buổi họp thất bại.";
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  const handleDryRun = async () => {
    setPreviewing(true);
    try {
      const results = await scanFn({ data: { dryRun: true } });
      setPreviewResults(results);
      setPreviewOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xem trước quét thất bại.";
      toast.error(msg);
    } finally {
      setPreviewing(false);
    }
  };

  const handleRescore = async (record: string) => {
    setRescoringRecord(record);
    try {
      const res = await rescoreFn({ data: { conferenceRecord: record } });
      if (res.status === "scored") {
        toast.success(`Chấm lại thành công: ${res.detail}`);
      } else if (res.status === "skipped") {
        toast.info(`Bỏ qua buổi họp: ${res.detail}`);
      } else {
        toast.error(`Chấm lại thất bại: ${res.detail}`);
      }
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chấm lại buổi họp thất bại.";
      toast.error(msg);
    } finally {
      setRescoringRecord(null);
    }
  };

  const columns: AdminColumn[] = [
    { key: "time", label: "Thời gian", className: "w-[20%]" },
    { key: "room", label: "Phòng họp", className: "w-[25%]" },
    { key: "status", label: "Trạng thái", className: "w-[15%]" },
    { key: "count", label: "Số người", className: "w-[10%] text-center" },
    { key: "detail", label: "Ghi chú", className: "w-[20%]" },
    ...(canManage ? [{ key: "action", label: "Thao tác", className: "w-[10%] text-right" }] : []),
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Kết quả điểm danh tự động</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Lịch sử các buổi họp được hệ thống quét và chấm điểm tự động (50 buổi gần nhất).
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="admin"
              onClick={handleDryRun}
              disabled={previewing || scanning}
            >
              {previewing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eye className="mr-1.5 h-3.5 w-3.5" />
              )}
              Xem trước
            </Button>
            <Button
              type="button"
              size="admin"
              onClick={handleScanNow}
              disabled={scanning || previewing}
            >
              {scanning ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-3.5 w-3.5" />
              )}
              Quét ngay
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : isMissingTableError(error) ? (
        <EmptyState
          tone="error"
          title="Chưa chạy migration"
          description="Chưa chạy migration 0082_meet_auto_attendance.sql trên Supabase."
        />
      ) : error ? (
        <EmptyState
          tone="error"
          title="Lỗi tải kết quả điểm danh"
          description={error instanceof Error ? error.message : String(error)}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Chưa có buổi họp nào được xử lý"
          description="Hệ thống sẽ tự động quét hằng ngày hoặc bạn có thể bấm 'Quét ngay' để kiểm tra."
        />
      ) : (
        <AdminTable columns={columns} minWidth="min-w-[760px]">
          {data.map((run) => {
            const conf = STATUS_CONFIG[run.status] ?? {
              label: run.status,
              tone: "neutral",
            };
            const roomName = run.meeting_rooms?.label || run.space_name || run.conference_record;
            const canRescore =
              canManage &&
              (run.status === "error" ||
                run.status === "unknown_room" ||
                run.status === "no_members");
            const isRescoring = rescoringRecord === run.conference_record;

            return (
              <AdminTableRow key={run.conference_record}>
                <td className="p-3 text-xs text-muted-foreground">
                  <div>{formatVietnamDateTime(run.meeting_start)}</div>
                  {run.meeting_end && (
                    <div className="text-[11px] text-muted-foreground/70">
                      kết thúc: {formatVietnamDateTime(run.meeting_end)}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <div className="font-medium text-foreground">{roomName}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {run.conference_record}
                  </div>
                </td>
                <td className="p-3">
                  <StatusPill tone={conf.tone}>{conf.label}</StatusPill>
                </td>
                <td className="p-3 text-center text-xs">
                  {run.present_count !== null ? (
                    <span className="font-medium">{run.present_count}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  <span title={run.detail} className="line-clamp-2">
                    {run.detail || "—"}
                  </span>
                </td>
                {canManage && (
                  <td className="p-3 text-right">
                    {canRescore ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="admin"
                        onClick={() => handleRescore(run.conference_record)}
                        disabled={isRescoring}
                        className="text-xs text-primary"
                      >
                        {isRescoring ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 h-3 w-3" />
                        )}
                        Chấm lại
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                )}
              </AdminTableRow>
            );
          })}
        </AdminTable>
      )}

      {/* Preview Modal for dryRun */}
      <AnimatePresence>
        {previewOpen && (
          <AdminModal
            title="Xem trước kết quả quét Meet"
            description="Chế độ xem trước (dryRun) mô phỏng kết quả xử lý các buổi họp đã kết thúc. Chưa có điểm nào được ghi."
            icon={Eye}
            size="lg"
            onClose={() => setPreviewOpen(false)}
            footer={
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-medium text-warning-foreground">
                  ⚠️ Chưa ghi điểm vào cơ sở dữ liệu
                </span>
                <Button size="admin" onClick={() => setPreviewOpen(false)}>
                  Đóng
                </Button>
              </div>
            }
          >
            {previewResults.length === 0 ? (
              <EmptyState
                title="Không có buổi họp mới nào"
                description="Tất cả các buổi họp gần đây đã được xử lý trước đó hoặc không có buổi họp nào đã kết thúc."
              />
            ) : (
              <div className="space-y-3">
                {previewResults.map((item) => {
                  const conf = STATUS_CONFIG[item.status] ?? {
                    label: item.status,
                    tone: "neutral",
                  };
                  return (
                    <div
                      key={item.conferenceRecord}
                      className="rounded-xl border border-border bg-card/60 p-3.5 text-xs shadow-2xs"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="font-semibold text-foreground">
                          {item.roomLabel || item.conferenceRecord}
                          {item.kind && (
                            <span className="ml-2 font-normal text-muted-foreground">
                              ({item.kind === "work" ? "Họp ban - 2đ" : "Họp toàn thể - 10đ"})
                            </span>
                          )}
                        </div>
                        <StatusPill tone={conf.tone}>{conf.label}</StatusPill>
                      </div>

                      <div className="mt-1 text-muted-foreground">
                        Thời gian: {formatVietnamDateTime(item.start)} –{" "}
                        {formatVietnamDateTime(item.end)}
                      </div>

                      <div className="mt-2 text-foreground">{item.detail}</div>

                      {(item.presentCount !== undefined ||
                        item.leaderCount !== undefined ||
                        item.unlinkedCount !== undefined) && (
                        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                          {item.presentCount !== undefined && (
                            <div className="flex items-center gap-1 font-medium text-success">
                              <Users className="h-3 w-3" />
                              <span>{item.presentCount} người nhận điểm</span>
                            </div>
                          )}
                          {item.leaderCount !== undefined && (
                            <div>Lãnh đạo (không điểm): {item.leaderCount}</div>
                          )}
                          {item.unlinkedCount !== undefined && (
                            <div>Chưa liên kết: {item.unlinkedCount}</div>
                          )}
                        </div>
                      )}

                      {item.matchedNames && item.matchedNames.length > 0 && (
                        <div className="mt-2 rounded-lg bg-secondary/30 p-2 text-[11px]">
                          <span className="font-medium text-muted-foreground">
                            Thành viên dự kiến nhận điểm:{" "}
                          </span>
                          <span className="text-foreground">{item.matchedNames.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </AdminModal>
        )}
      </AnimatePresence>
    </div>
  );
}
