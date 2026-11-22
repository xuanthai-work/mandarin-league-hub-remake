import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { EmptyState } from "@/components/admin/kit/EmptyState";
import { getMeetAutoStatus } from "@/lib/meet-auto.functions";
import { MeetRoomsCard } from "./MeetRoomsCard";
import { MeetRunsCard } from "./MeetRunsCard";

export function MeetAutoPanel() {
  const getStatusFn = useServerFn(getMeetAutoStatus);

  const { data, error, isLoading } = useQuery({
    queryKey: ["admin", "meet_auto_status"],
    queryFn: () => getStatusFn(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        tone="error"
        title="Lỗi kiểm tra cấu hình tự động"
        description={error instanceof Error ? error.message : String(error)}
      />
    );
  }

  if (!data || !data.configured) {
    const missingList = data?.missing?.length ? data.missing.join(", ") : "Chưa cấu hình";
    return (
      <EmptyState
        title="Điểm danh tự động chưa được bật"
        description={`Hệ thống cần cấu hình các biến môi trường sau trên server để kích hoạt: ${missingList}. Vui lòng liên hệ quản trị viên kỹ thuật.`}
      />
    );
  }

  return (
    <div className="space-y-8">
      <MeetRoomsCard
        canManage={data.canManage}
        scope={data.scope}
        department={data.department}
        userId={data.userId}
      />
      <MeetRunsCard canManage={data.canManage} scope={data.scope} />
    </div>
  );
}
