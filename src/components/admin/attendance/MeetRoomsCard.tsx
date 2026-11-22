import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Copy, ExternalLink, Loader2, Plus, RefreshCw, Video } from "lucide-react";
import { toast } from "sonner";

import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { CtaLink } from "@/components/site/CtaLink";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getRoomsPresence } from "@/lib/meet-presence.functions";
import { presenceLabel, sharedRoomWarning, type RoomPresence } from "@/lib/meet-presence";
import { deptName } from "@/lib/recruitment";
import { CreateRoomModal } from "./CreateRoomModal";

type MeetingRoomRow = Database["public"]["Tables"]["meeting_rooms"]["Row"];

function isMissingTableError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  return code === "42P01" || (msg.includes("relation") && msg.includes("does not exist"));
}

function formatCheckTime(iso?: string): string {
  if (!iso || iso === "1970-01-01T00:00:00Z") return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function MeetRoomsCard({ canManage }: { canManage: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);
  const presenceFn = useServerFn(getRoomsPresence);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["admin", "meeting_rooms"],
    queryFn: async () => {
      const { data: rooms, error: queryError } = await supabase.from("meeting_rooms").select("*");

      if (queryError) throw queryError;
      const list = (rooms ?? []) as MeetingRoomRow[];
      const kindRank: Record<string, number> = {
        club: 0,
        shared: 1,
        work: 2,
      };
      return list.sort((a, b) => {
        const rankDiff = (kindRank[a.kind] ?? 99) - (kindRank[b.kind] ?? 99);
        if (rankDiff !== 0) return rankDiff;
        return a.label.localeCompare(b.label, "vi");
      });
    },
  });

  const {
    data: presenceList,
    isFetching: isFetchingPresence,
    refetch: refetchPresence,
  } = useQuery({
    queryKey: ["admin", "meeting_rooms_presence"],
    queryFn: async () => {
      try {
        return await presenceFn();
      } catch {
        return [];
      }
    },
    enabled: Boolean(data && data.length > 0),
    staleTime: 60_000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const presenceMap = useMemo(() => {
    const map = new Map<string, RoomPresence>();
    for (const p of presenceList ?? []) {
      map.set(p.roomId, p);
    }
    return map;
  }, [presenceList]);

  const warningText = useMemo(() => {
    if (!data || data.length === 0) return null;
    return sharedRoomWarning(data, presenceMap, (r) => r.id);
  }, [data, presenceMap]);

  const copyLink = async (uri: string) => {
    try {
      await navigator.clipboard.writeText(uri);
      toast.success("Đã sao chép liên kết phòng họp");
    } catch {
      toast.error("Không thể sao chép liên kết");
    }
  };

  const columns: AdminColumn[] = [
    { key: "label", label: "Tên phòng", className: "w-[30%]" },
    { key: "kind", label: "Loại cuộc họp", className: "w-[25%]" },
    { key: "link", label: "Liên kết Meet", className: "w-[25%]" },
    { key: "status", label: "Trạng thái", className: "w-[20%] text-right" },
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Phòng họp chính thức</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Các phòng cố định do bot Google sở hữu (quyền OPEN, vào họp thẳng). Trưởng Ban và Phó
            Ban chỉ thấy phòng của Ban mình và các phòng chung.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="admin"
            onClick={() => refetchPresence()}
            disabled={isFetchingPresence}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${isFetchingPresence ? "animate-spin" : ""}`}
            />
            Kiểm tra lại
          </Button>
          {canManage && (
            <Button size="admin" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Tạo phòng
            </Button>
          )}
        </div>
      </div>

      {warningText && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <span>{warningText}</span>
        </div>
      )}

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
          title="Lỗi tải danh sách phòng họp"
          description={error instanceof Error ? error.message : String(error)}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Chưa có phòng họp chính thức nào"
          description={
            canManage
              ? "Bấm 'Tạo phòng' để bot Google tạo phòng họp đầu tiên."
              : "Chưa có phòng họp nào được tạo trong hệ thống."
          }
          action={
            canManage ? (
              <Button size="admin" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Tạo phòng
              </Button>
            ) : undefined
          }
        />
      ) : (
        <AdminTable columns={columns} minWidth="min-w-[640px]">
          {data.map((room) => {
            const kindText =
              room.kind === "club"
                ? "Họp toàn thể"
                : room.kind === "shared"
                  ? "Họp chung (liên Ban)"
                  : `Họp ban (${deptName(room.department)})`;

            const presence = presenceMap.get(room.id);
            const label = presenceLabel(presence);
            const isBusy = presence?.active && presence.count > 0;
            const tone = isBusy ? "info" : "neutral";
            const checkTime = formatCheckTime(presence?.checkedAt);

            return (
              <AdminTableRow key={room.id}>
                <td className="p-3">
                  <div className="font-medium text-foreground">{room.label}</div>
                  <div className="text-xs text-muted-foreground">{room.space_name}</div>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{kindText}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <CtaLink
                      href={room.meeting_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Vào phòng</span>
                    </CtaLink>
                    <Button
                      type="button"
                      variant="ghost"
                      size="admin-icon"
                      onClick={() => copyLink(room.meeting_uri)}
                      title="Sao chép liên kết"
                      className="h-6 w-6"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <StatusPill tone={tone}>{label}</StatusPill>
                    {checkTime && (
                      <span className="text-[10px] text-muted-foreground">
                        kiểm tra lúc {checkTime}
                        {presence?.stale ? " (cũ)" : ""}
                      </span>
                    )}
                    {!room.active && (
                      <span className="text-[10px] font-medium text-warning">Không tính điểm</span>
                    )}
                  </div>
                </td>
              </AdminTableRow>
            );
          })}
        </AdminTable>
      )}

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          refetch();
          refetchPresence();
        }}
      />
    </div>
  );
}
