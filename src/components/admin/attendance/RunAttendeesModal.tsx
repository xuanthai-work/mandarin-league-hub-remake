import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Users } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { AdminModal } from "@/components/admin/kit/AdminModal";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { MemberAvatar } from "@/components/admin/kit/MemberAvatar";
import { Button } from "@/components/ui/button";
import { useAvatarUrls } from "@/lib/avatars";
import { getMeetRunAttendees } from "@/lib/meet-auto.functions";
import { deptName } from "@/lib/recruitment";

export function RunAttendeesModal({
  open,
  onClose,
  conferenceRecord,
  roomLabel,
  meetingTime,
}: {
  open: boolean;
  onClose: () => void;
  conferenceRecord: string | null;
  roomLabel?: string | undefined;
  meetingTime?: string | undefined;
}) {
  const getAttendeesFn = useServerFn(getMeetRunAttendees);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "meet_run_attendees", conferenceRecord],
    queryFn: async () => {
      if (!conferenceRecord) return [];
      return getAttendeesFn({ data: { conferenceRecord } });
    },
    enabled: Boolean(open && conferenceRecord),
    staleTime: 5 * 60 * 1000,
  });

  const avatarPaths = (data ?? []).map((m) => m.avatar_path).filter(Boolean);
  const { data: avatarMap } = useAvatarUrls(avatarPaths);

  if (!conferenceRecord) return null;

  const description = [roomLabel, meetingTime].filter(Boolean).join(" • ");

  return (
    <AnimatePresence>
      {open && (
        <AdminModal
          title="Danh sách điểm danh"
          description={description || "Các thành viên đã được cộng điểm trong buổi họp này."}
          icon={Users}
          size="sm"
          onClose={onClose}
          footer={
            <div className="flex w-full items-center justify-end">
              <Button size="admin" onClick={onClose}>
                Đóng
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : error ? (
              <EmptyState
                tone="error"
                title="Không thể tải danh sách điểm danh"
                description={error instanceof Error ? error.message : String(error)}
              />
            ) : !data || data.length === 0 ? (
              <EmptyState
                title="Chưa có ai được điểm danh"
                description="Buổi họp không có thành viên nào đủ điều kiện cộng điểm."
              />
            ) : (
              <div className="max-h-80 divide-y divide-border/40 overflow-y-auto pr-1">
                {data.map((member) => (
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
        </AdminModal>
      )}
    </AnimatePresence>
  );
}
