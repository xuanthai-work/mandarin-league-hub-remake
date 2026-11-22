import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { MeetAutoPanel } from "@/components/admin/attendance/MeetAutoPanel";
import { can } from "@/lib/permission-catalog";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/attendance")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Phòng họp | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const access = useAdminAccess().data;
  const canAttend = !!access && can(access.perms, "points.attendance");

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Phòng họp"
        description="Quản lý các phòng họp chính thức và kết quả điểm danh Google Meet tự động."
      />

      {!canAttend ? (
        <EmptyState
          tone="error"
          title="Bạn chưa có quyền xem phòng họp"
          description="Chỉ Trưởng Ban, Phó Ban hoặc quản trị viên mới có quyền xem phòng họp và kết quả điểm danh."
        />
      ) : (
        <MeetAutoPanel />
      )}
    </div>
  );
}
