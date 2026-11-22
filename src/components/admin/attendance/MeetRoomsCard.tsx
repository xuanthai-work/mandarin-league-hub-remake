import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, ExternalLink, Loader2, Plus, Video } from "lucide-react";
import { toast } from "sonner";

import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { useConfirm } from "@/components/admin/kit/useConfirm";
import { CtaLink } from "@/components/site/CtaLink";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { setMeetingRoomActive } from "@/lib/meet-auto.functions";
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

export function MeetRoomsCard({ canManage }: { canManage: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const setActiveFn = useServerFn(setMeetingRoomActive);
  const { confirm, dialog } = useConfirm();

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["admin", "meeting_rooms"],
    queryFn: async () => {
      const { data: rooms, error: queryError } = await supabase
        .from("meeting_rooms")
        .select("*")
        .order("kind", { ascending: false })
        .order("label", { ascending: true });

      if (queryError) throw queryError;
      return (rooms ?? []) as MeetingRoomRow[];
    },
  });

  const handleToggle = async (id: string, label: string, nextActive: boolean) => {
    if (!nextActive) {
      const ok = await confirm({
        title: "Tắt phòng họp",
        description: `Bạn có chắc muốn tắt "${label}"?\nCác buổi họp tiếp theo trong phòng này sẽ không được tự động chấm điểm.`,
        confirmLabel: "Tắt phòng",
        destructive: true,
      });
      if (!ok) return;
    }

    setSwitchingId(id);
    try {
      await setActiveFn({ data: { id, active: nextActive } });
      toast.success(nextActive ? `Đã bật "${label}"` : `Đã tắt "${label}"`);
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cập nhật trạng thái phòng họp thất bại.";
      toast.error(msg);
    } finally {
      setSwitchingId(null);
    }
  };

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
            Các phòng cố định do bot Google sở hữu (quyền OPEN, vào họp thẳng).
          </p>
        </div>
        {canManage && (
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
            const isWork = room.kind === "work";
            const kindText = isWork ? `Họp ban (${deptName(room.department)})` : "Họp toàn thể";

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
                  <div className="flex items-center justify-end gap-2">
                    <StatusPill tone={room.active ? "success" : "neutral"}>
                      {room.active ? "Đang dùng" : "Tắt"}
                    </StatusPill>
                    {canManage && (
                      <Switch
                        checked={room.active}
                        disabled={switchingId === room.id}
                        onCheckedChange={(checked) => handleToggle(room.id, room.label, checked)}
                      />
                    )}
                  </div>
                </td>
              </AdminTableRow>
            );
          })}
        </AdminTable>
      )}

      {dialog}

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => refetch()}
      />
    </div>
  );
}
