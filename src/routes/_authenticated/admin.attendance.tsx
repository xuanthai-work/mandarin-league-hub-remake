import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
import { MeetAttendanceView } from "@/components/admin/attendance/MeetAttendanceView";
import { MeetAutoPanel } from "@/components/admin/attendance/MeetAutoPanel";
import { can } from "@/lib/permission-catalog";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/attendance")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Điểm danh họp | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const access = useAdminAccess().data;
  const canAttend = !!access && can(access.perms, "points.attendance");
  const [mode, setMode] = useState<"auto" | "manual">("auto");

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          title="Điểm danh họp"
          description="Quản lý điểm danh Google Meet tự động qua các phòng chính thức, hoặc điểm danh thủ công dự phòng."
        />
        {canAttend && (
          <div className="self-start sm:self-auto sm:pt-1">
            <SegmentedControl
              label="Chế độ điểm danh"
              value={mode}
              onChange={(val) => setMode(val as "auto" | "manual")}
              options={[
                { value: "auto", label: "Tự động" },
                { value: "manual", label: "Thủ công" },
              ]}
            />
          </div>
        )}
      </div>

      {!canAttend ? (
        <EmptyState
          tone="error"
          title="Bạn chưa có quyền điểm danh họp"
          description="Chỉ Trưởng Ban, Phó Ban hoặc quản trị viên mới có quyền chấm điểm danh."
        />
      ) : mode === "auto" ? (
        <MeetAutoPanel />
      ) : (
        <MeetAttendanceView />
      )}
    </div>
  );
}
