import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, Loader2, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";

import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { MemberAvatar } from "@/components/admin/kit/MemberAvatar";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";
import { useAvatarUrls } from "@/lib/avatars";
import { getMeetRunAttendees, rescoreMeetConference } from "@/lib/meet-auto.functions";
import { deptName } from "@/lib/recruitment";

export type MeetAutoRunRow = Database["public"]["Tables"]["meet_auto_runs"]["Row"] & {
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

function formatVietnamTimeOnly(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export interface RunDrawerProps {
  run: MeetAutoRunRow | null;
  roomName: string;
  canManage: boolean;
  onClose: () => void;
  onRescored: () => void;
}

export function RunDrawer({ run, roomName, canManage, onClose, onRescored }: RunDrawerProps) {
  const getAttendeesFn = useServerFn(getMeetRunAttendees);
  const rescoreFn = useServerFn(rescoreMeetConference);

  const [rescoring, setRescoring] = useState(false);

  const isScored = Boolean(run?.attendance_session_id);
  const conferenceRecord = run?.conference_record ?? "";

  const {
    data: attendees,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "meet_run_attendees", conferenceRecord],
    queryFn: async () => {
      if (!conferenceRecord) return [];
      return getAttendeesFn({ data: { conferenceRecord } });
    },
    enabled: Boolean(run && isScored && conferenceRecord),
    staleTime: 5 * 60 * 1000,
  });

  const avatarPaths = (attendees ?? []).map((m) => m.avatar_path).filter(Boolean);
  const { data: avatarMap } = useAvatarUrls(avatarPaths);

  if (!run) return null;

  const conf = STATUS_CONFIG[run.status] ?? {
    label: run.status,
    tone: "neutral",
  };

  const timeSubtitle = run.meeting_start
    ? `${formatVietnamDateTime(run.meeting_start)}${
        run.meeting_end ? ` – ${formatVietnamTimeOnly(run.meeting_end)}` : ""
      }`
    : "Buổi họp Google Meet";

  const outsideMatch = run.detail
    ? /(\d+)\s+người ngoài Ban không tính điểm/.exec(run.detail)
    : null;
  const outsideCount = outsideMatch && outsideMatch[1] ? parseInt(outsideMatch[1], 10) : 0;

  const canRescore =
    canManage &&
    (run.status === "error" || run.status === "unknown_room" || run.status === "no_members");

  const handleRescore = async () => {
    if (!run) return;
    setRescoring(true);
    try {
      const res = await rescoreFn({ data: { conferenceRecord: run.conference_record } });
      if (res.status === "scored") {
        toast.success(`Chấm lại thành công: ${res.detail}`);
      } else if (res.status === "skipped") {
        toast.info(`Bỏ qua buổi họp: ${res.detail}`);
      } else {
        toast.error(`Chấm lại thất bại: ${res.detail}`);
      }
      onRescored();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chấm lại buổi họp thất bại.";
      toast.error(msg);
    } finally {
      setRescoring(false);
    }
  };

  return (
    <AnimatePresence>
      <AdminDrawer
        title={roomName}
        subtitle={timeSubtitle}
        leading={<History className="h-4 w-4 text-primary" />}
        onClose={onClose}
        dismissible={!rescoring}
        bodyClassName="space-y-6"
        footer={
          <div className="flex w-full items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="admin"
              onClick={onClose}
              disabled={rescoring}
            >
              Đóng
            </Button>
          </div>
        }
      >
        {/* 1. Tổng quan buổi họp */}
        <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Trạng thái:</span>
            <StatusPill tone={conf.tone}>{conf.label}</StatusPill>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Số người tham gia:</span>
            <span className="font-medium text-foreground">
              {run.present_count !== null ? run.present_count : "—"}
              {outsideCount > 0 && (
                <span className="ml-1 text-[11px] text-muted-foreground font-normal">
                  ({outsideCount} ngoài Ban không tính điểm)
                </span>
              )}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <span className="text-muted-foreground">Ghi chú:</span>
            <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground whitespace-pre-wrap">
              {run.detail || "Không có ghi chú"}
            </div>
          </div>

          <div className="pt-1 text-[10px] text-muted-foreground font-mono break-all">
            Mã cuộc họp: {run.conference_record}
          </div>
        </div>

        {/* 2. Danh sách người được cộng điểm (nếu có attendance_session_id) */}
        {isScored && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold text-foreground">Người được cộng điểm</h3>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : error ? (
              <EmptyState
                tone="error"
                title="Không thể tải danh sách điểm danh"
                description={error instanceof Error ? error.message : String(error)}
              />
            ) : !attendees || attendees.length === 0 ? (
              <EmptyState
                title="Chưa có ai được điểm danh"
                description="Buổi họp không có thành viên nào đủ điều kiện cộng điểm."
              />
            ) : (
              <div className="max-h-80 divide-y divide-border/40 overflow-y-auto pr-1">
                {attendees.map((member) => (
                  <div
                    key={member.member_id}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <MemberAvatar
                      src={member.avatar_path ? (avatarMap?.get(member.avatar_path) ?? null) : null}
                      name={member.full_name}
                      className="h-8 w-8 text-xs shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-foreground">
                        {member.full_name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">{member.member_code}</span>
                        <span>•</span>
                        <span>{deptName(member.department)}</span>
                        {member.position && (
                          <>
                            <span>•</span>
                            <span className="truncate">{member.position}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
              Chỉ hiện người đã được cộng điểm. Người ngoài Ban hoặc chưa liên kết Google không nằm
              trong danh sách.
            </div>
          </div>
        )}

        {/* 3. Khu thao tác cuối drawer (chấm lại) */}
        {canRescore && (
          <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
            <div className="text-xs font-semibold text-foreground">Thao tác xử lý lại</div>
            <p className="text-xs text-muted-foreground">
              Chấm lại buổi họp này ngay bây giờ. Hệ thống sẽ đọc lại nhật ký tham gia từ Google và
              thử ghi nhận điểm danh.
            </p>
            <Button
              type="button"
              variant="outline"
              size="admin"
              onClick={handleRescore}
              disabled={rescoring}
              className="mt-2 text-primary"
            >
              {rescoring ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Chấm lại buổi họp
            </Button>
          </div>
        )}
      </AdminDrawer>
    </AnimatePresence>
  );
}
