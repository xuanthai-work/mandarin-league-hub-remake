import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { MeetAttendanceView } from "@/components/admin/attendance/MeetAttendanceView";
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

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Điểm danh họp"
        description="Đọc người có mặt từ Google Meet và cộng điểm một lần cho cả buổi."
      />

      {!canAttend ? (
        <EmptyState
          tone="error"
          title="Bạn chưa có quyền điểm danh họp"
          description="Chỉ Trưởng Ban, Phó Ban hoặc quản trị viên mới có quyền chấm điểm danh."
        />
      ) : (
        <MeetAttendanceView />
      )}
    </div>
  );
}
