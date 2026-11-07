import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { auditSummary, type AuditRow } from "@/lib/permission-admin";
import type { MemberRow } from "./GrantModal";

type AuditLog = AuditRow & {
  id: number;
  actor_label: string;
  member_id: string | null;
  note: string;
  created_at: string;
};

const COLUMNS: AdminColumn[] = [
  { key: "time", label: "Thời gian", className: "w-[16%]" },
  { key: "actor", label: "Người thực hiện", className: "w-[18%]" },
  { key: "summary", label: "Nội dung" },
  { key: "note", label: "Ghi chú", className: "w-[18%]" },
];

export function AuditTab() {
  const logs = useQuery({
    queryKey: ["permission-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permission_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });

  const members = useQuery({
    queryKey: ["permission-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, member_code, department, position, status");
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
  });

  const memberById = useMemo(
    () => new Map((members.data ?? []).map((m) => [m.id, m])),
    [members.data],
  );

  if (logs.isError)
    return (
      <EmptyState
        tone="error"
        title="Không tải được nhật ký phân quyền"
        description={logs.error instanceof Error ? logs.error.message : "Vui lòng thử lại."}
      />
    );

  if (logs.isLoading) return <EmptyState title="Đang tải nhật ký phân quyền…" />;

  const rows = logs.data ?? [];

  if (rows.length === 0) return <EmptyState title="Chưa có thay đổi phân quyền nào" />;

  return (
    <div className="space-y-2">
      <AdminTable columns={COLUMNS} minWidth="min-w-[820px]">
        {rows.map((log) => {
          const memberName = log.member_id
            ? (memberById.get(log.member_id)?.full_name ?? "thành viên đã xóa")
            : "thành viên đã xóa";
          return (
            <AdminTableRow key={log.id}>
              <td className="p-3 text-xs text-muted-foreground">
                {new Date(log.created_at).toLocaleString("vi-VN")}
              </td>
              <td className="p-3 text-xs">{log.actor_label || "—"}</td>
              <td className="p-3">{auditSummary(log, memberName)}</td>
              <td className="p-3 text-xs text-muted-foreground">{log.note || "—"}</td>
            </AdminTableRow>
          );
        })}
      </AdminTable>
      {rows.length >= 200 && (
        <p className="text-xs text-muted-foreground">Hiển thị 200 thay đổi gần nhất.</p>
      )}
    </div>
  );
}
