import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
import { AuditTab } from "@/components/admin/permissions/AuditTab";
import { GrantsTab } from "@/components/admin/permissions/GrantsTab";
import { MatrixTab } from "@/components/admin/permissions/MatrixTab";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/permissions")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Phân quyền | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: PermissionsPage,
});

type Tab = "matrix" | "grants" | "audit";

const PAGE_FRAME = "mx-auto max-w-7xl space-y-5 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8";

function PermissionsPage() {
  const access = useAdminAccess();
  const [tab, setTab] = useState<Tab>("matrix");

  if (access.isLoading)
    return (
      <div className={PAGE_FRAME}>
        <EmptyState title="Đang kiểm tra quyền…" />
      </div>
    );

  if (!access.data?.perms.isAdmin)
    return (
      <div className={PAGE_FRAME}>
        <EmptyState title="Chỉ Quản trị viên được quản lý phân quyền" />
      </div>
    );

  return (
    <div className={PAGE_FRAME}>
      <AdminPageHeader
        title="Phân quyền"
        description="Quyền theo chức vụ của từng ban, quyền riêng có thời hạn và nhật ký thay đổi."
      />

      <SegmentedControl
        label="Chọn mục"
        value={tab}
        onChange={setTab}
        options={[
          { value: "matrix", label: "Ma trận" },
          { value: "grants", label: "Quyền riêng" },
          { value: "audit", label: "Nhật ký" },
        ]}
      />

      {tab === "matrix" && <MatrixTab />}
      {tab === "grants" && <GrantsTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}
