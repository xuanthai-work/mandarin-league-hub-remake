import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, Loader2, Play } from "lucide-react";
import { toast } from "sonner";

import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { scanMeetNow } from "@/lib/meet-auto.functions";
import { RunDrawer, type MeetAutoRunRow } from "./RunDrawer";

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

function shortenRecordId(record: string): string {
  const prefix = "conferenceRecords/";
  const id = record.startsWith(prefix) ? record.slice(prefix.length) : record;
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function MeetRunsCard({ canManage }: { canManage: boolean; scope?: "all" | "own" }) {
  const scanFn = useServerFn(scanMeetNow);

  const [scanning, setScanning] = useState(false);
  const [selectedRun, setSelectedRun] = useState<MeetAutoRunRow | null>(null);

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

  const { data: rooms } = useQuery({
    queryKey: ["admin", "meeting_rooms"],
    queryFn: async () => {
      const { data: list, error: queryError } = await supabase
        .from("meeting_rooms")
        .select("*")
        .order("kind", { ascending: false })
        .order("label", { ascending: true });

      if (queryError) throw queryError;
      return list ?? [];
    },
  });

  const roomsBySpace = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rooms ?? []) {
      if (r.space_name) map.set(r.space_name, r.label);
    }
    return map;
  }, [rooms]);

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

  const columns: AdminColumn[] = [
    { key: "time", label: "Thời gian", className: "w-[20%]" },
    { key: "room", label: "Phòng họp", className: "w-[25%]" },
    { key: "status", label: "Trạng thái", className: "w-[15%]" },
    { key: "count", label: "Số người", className: "w-[15%] text-center" },
    { key: "detail", label: "Ghi chú", className: "w-[25%]" },
  ];

  const selectedRoomName = selectedRun
    ? selectedRun.meeting_rooms?.label ||
      (selectedRun.space_name ? roomsBySpace.get(selectedRun.space_name) : undefined) ||
      selectedRun.space_name ||
      shortenRecordId(selectedRun.conference_record)
    : "";

  return (
    <div className="space-y-4">
      {/* 1. Header hàng tiêu đề phần */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Kết quả điểm danh tự động</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Hệ thống tự quét mỗi ngày lúc 03:00 sáng. Bấm &quot;Cập nhật kết quả&quot; nếu muốn quét
            ngay.
          </p>
        </div>

        {canManage && (
          <Button
            type="button"
            variant="outline"
            size="admin"
            onClick={handleScanNow}
            disabled={scanning}
            className="self-start sm:self-auto"
          >
            {scanning ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-1.5 h-3.5 w-3.5" />
            )}
            Cập nhật kết quả
          </Button>
        )}
      </div>

      {/* 2. Bảng kết quả điểm danh */}
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
          description="Hệ thống sẽ tự động quét hằng ngày hoặc bạn có thể bấm 'Cập nhật kết quả' để kiểm tra."
        />
      ) : (
        <AdminTable columns={columns} minWidth="min-w-[760px]">
          {data.map((run) => {
            const conf = STATUS_CONFIG[run.status] ?? {
              label: run.status,
              tone: "neutral",
            };
            const roomName =
              run.meeting_rooms?.label ||
              (run.space_name ? roomsBySpace.get(run.space_name) : undefined) ||
              run.space_name ||
              shortenRecordId(run.conference_record);

            const outsideMatch = run.detail
              ? /(\d+)\s+người ngoài Ban không tính điểm/.exec(run.detail)
              : null;
            const outsideCount =
              outsideMatch && outsideMatch[1] ? parseInt(outsideMatch[1], 10) : 0;

            return (
              <AdminTableRow key={run.conference_record} onOpen={() => setSelectedRun(run)}>
                <td className="p-3 text-xs text-muted-foreground">
                  <div>{formatVietnamDateTime(run.meeting_start)}</div>
                  {run.meeting_end && (
                    <div className="text-[11px] text-muted-foreground/70">
                      kết thúc: {formatVietnamDateTime(run.meeting_end)}
                    </div>
                  )}
                </td>
                <td className="p-3 overflow-hidden">
                  <div
                    className="flex items-center gap-1.5 truncate font-medium text-foreground"
                    title={roomName}
                  >
                    <span className="truncate">{roomName}</span>
                    {run.meeting_rooms?.kind === "shared" && (
                      <span className="shrink-0 rounded bg-secondary px-1 text-[10px] text-muted-foreground">
                        Họp chung
                      </span>
                    )}
                  </div>
                  <span
                    title={run.conference_record}
                    className="block max-w-full truncate font-mono text-[11px] text-muted-foreground"
                  >
                    {shortenRecordId(run.conference_record)}
                  </span>
                </td>
                <td className="p-3">
                  <StatusPill tone={conf.tone}>{conf.label}</StatusPill>
                </td>
                <td className="p-3 text-center text-xs">
                  {run.present_count !== null ? (
                    <div>
                      <span className="font-medium">{run.present_count}</span>
                      {outsideCount > 0 && (
                        <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                          Ngoài Ban: {outsideCount}
                        </div>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  <span title={run.detail} className="line-clamp-2">
                    {run.detail || "—"}
                  </span>
                </td>
              </AdminTableRow>
            );
          })}
        </AdminTable>
      )}

      {/* Drawer chi tiết buổi họp & điểm danh */}
      {selectedRun && (
        <RunDrawer
          run={selectedRun}
          roomName={selectedRoomName}
          canManage={canManage}
          onClose={() => setSelectedRun(null)}
          onRescored={() => refetch()}
        />
      )}
    </div>
  );
}
