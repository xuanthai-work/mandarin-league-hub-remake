import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { CtaLink } from "@/components/site/CtaLink";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getRoomsPresence } from "@/lib/meet-presence.functions";
import { presenceLabel, sharedRoomWarning, type RoomPresence } from "@/lib/meet-presence";
import { canManageRoom, type RoomKind } from "@/lib/meet-room-access";
import { deptName } from "@/lib/recruitment";
import { matchesSearch } from "@/lib/search";
import { CreateRoomModal } from "./CreateRoomModal";
import { RoomDrawer } from "./RoomDrawer";

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

interface MeetRoomsCardProps {
  canManage: boolean;
  scope?: "all" | "own" | undefined;
  department?: string | null | undefined;
  userId?: string | undefined;
}

export function MeetRoomsCard({ canManage, scope, department, userId }: MeetRoomsCardProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoomRow | null>(null);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();
  const presenceFn = useServerFn(getRoomsPresence);

  const canCreate = canManage || scope === "all" || scope === "own";

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

  const workDepts = useMemo(() => {
    const set = new Set<string>();
    for (const r of data ?? []) {
      if (r.kind === "work" && r.department) {
        set.add(r.department);
      }
    }
    return Array.from(set).sort();
  }, [data]);

  const filteredRooms = useMemo(() => {
    if (!data) return [];
    let list = data;

    // 1. Filter by category
    if (filter !== "all") {
      if (scope === "own") {
        if (filter === "own") {
          list = list.filter(
            (r) => r.kind === "work" && (!department || r.department === department),
          );
        } else if (filter === "shared") {
          list = list.filter((r) => r.kind === "shared");
        }
      } else {
        if (filter === "club") {
          list = list.filter((r) => r.kind === "club");
        } else if (filter === "shared") {
          list = list.filter((r) => r.kind === "shared");
        } else if (filter.startsWith("dept:")) {
          const targetDept = filter.slice(5);
          list = list.filter((r) => r.kind === "work" && r.department === targetDept);
        }
      }
    }

    // 2. Filter by search query (accent-insensitive)
    if (searchQuery.trim()) {
      list = list.filter((r) => matchesSearch(r.label, searchQuery));
    }

    return list;
  }, [data, filter, scope, department, searchQuery]);

  const columns: AdminColumn[] = [
    { key: "label", label: "Tên phòng", className: "w-[35%]" },
    { key: "kind", label: "Loại cuộc họp", className: "w-[25%]" },
    { key: "link", label: "Liên kết Meet", className: "w-[25%]" },
    { key: "status", label: "Trạng thái", className: "w-[15%] text-right" },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Header hàng tiêu đề phần */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Phòng họp chính thức</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {scope === "own"
              ? "Danh sách phòng Google Meet của Ban bạn và các phòng họp chung. Phòng Ban và phòng Chung cho 2 điểm/buổi."
              : "Danh sách phòng Google Meet chính thức. Phòng Ban cho 2 điểm/buổi, phòng Chung cho 2 điểm/buổi, phòng Toàn thể cho 10 điểm/buổi."}
          </p>
        </div>
        {canCreate && (
          <Button
            size="admin"
            onClick={() => setCreateOpen(true)}
            className="self-start sm:self-auto"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Tạo phòng
          </Button>
        )}
      </div>

      {/* 2. Thanh lọc */}
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Tìm tên phòng…"
          label="Tìm kiếm phòng họp"
        />

        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger
            aria-label="Lọc phòng họp"
            className="h-9 w-[190px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue placeholder="Lọc phòng họp" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Tất cả
            </SelectItem>
            {scope === "own" ? (
              <>
                <SelectItem value="own" className="text-xs">
                  Ban mình
                </SelectItem>
                <SelectItem value="shared" className="text-xs">
                  Họp chung
                </SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="club" className="text-xs">
                  Họp toàn thể
                </SelectItem>
                <SelectItem value="shared" className="text-xs">
                  Họp chung
                </SelectItem>
                {workDepts.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                      Họp ban
                    </SelectLabel>
                    {workDepts.map((d) => (
                      <SelectItem key={d} value={`dept:${d}`} className="text-xs">
                        {deptName(d)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </>
            )}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="admin-icon"
          onClick={() => refetchPresence()}
          disabled={isFetchingPresence}
          aria-label="Kiểm tra lại"
          title="Kiểm tra lại"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetchingPresence ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* 3. Cảnh báo phòng chung đang có người */}
      {warningText && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <span>{warningText}</span>
        </div>
      )}

      {/* 4. Bảng phòng họp */}
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
            canCreate
              ? "Bấm 'Tạo phòng' để bot Google tạo phòng họp đầu tiên."
              : "Chưa có phòng họp nào được tạo trong hệ thống."
          }
          action={
            canCreate ? (
              <Button size="admin" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Tạo phòng
              </Button>
            ) : undefined
          }
        />
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Không có phòng họp phù hợp"
          description="Không tìm thấy phòng họp nào theo bộ lọc hoặc từ khóa tìm kiếm đã chọn."
        />
      ) : (
        <AdminTable columns={columns} minWidth="min-w-[640px]">
          {filteredRooms.map((room) => {
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

            const canManageThis = canManageRoom(
              scope,
              { userId: userId ?? "", department },
              {
                kind: room.kind as RoomKind,
                department: room.department,
                createdBy: room.created_by,
              },
            );

            return (
              <AdminTableRow
                key={room.id}
                {...(canManageThis ? { onOpen: () => setEditingRoom(room) } : {})}
              >
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

      {/* Drawer tạo phòng */}
      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        scope={scope}
        myDepartment={department}
        onCreated={() => {
          refetch();
          refetchPresence();
          queryClient.invalidateQueries({ queryKey: ["admin", "meeting_rooms"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "meet_auto_runs"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "meeting_rooms_presence"] });
        }}
      />

      {/* Drawer sửa phòng */}
      {editingRoom && (
        <RoomDrawer
          room={editingRoom}
          scope={scope}
          onClose={() => setEditingRoom(null)}
          onUpdated={() => {
            refetch();
            refetchPresence();
            queryClient.invalidateQueries({ queryKey: ["admin", "meeting_rooms"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "meet_auto_runs"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "meeting_rooms_presence"] });
          }}
          onDeleted={() => {
            refetch();
            refetchPresence();
            queryClient.invalidateQueries({ queryKey: ["admin", "meeting_rooms"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "meet_auto_runs"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "meeting_rooms_presence"] });
          }}
        />
      )}
    </div>
  );
}
