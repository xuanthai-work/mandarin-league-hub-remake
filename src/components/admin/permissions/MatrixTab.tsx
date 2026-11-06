import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENT_IDS } from "@/lib/permission-catalog";
import {
  ALL_DEPARTMENTS_KEY,
  actionGroups,
  cellState,
  departmentLabel,
  positionsFor,
  scopeLabel,
  type MatrixRow,
} from "@/lib/permission-admin";

const cellKey = (department: string, position: string, action: string) =>
  `${department}|${position}|${action}`;

export function MatrixTab() {
  const qc = useQueryClient();
  const [department, setDepartment] = useState<string>(ALL_DEPARTMENTS_KEY);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const matrix = useQuery({
    queryKey: ["permission-matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("position_permissions")
        .select("department, position, action, scope");
      if (error) throw error;
      return (data ?? []) as MatrixRow[];
    },
  });

  const rows = matrix.data ?? [];
  const positions = positionsFor(department);

  const save = async (position: string, action: string, value: string) => {
    const key = cellKey(department, position, action);
    setSaving((prev) => ({ ...prev, [key]: true }));
    const { error } = await supabase.rpc("admin_set_position_permission", {
      _department: department,
      _position: position,
      _action: action,
      _scope: value === "none" ? null : value,
    });
    setSaving((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã cập nhật quyền");
    qc.invalidateQueries({ queryKey: ["permission-matrix"] });
    qc.invalidateQueries({ queryKey: ["permission-audit"] });
  };

  if (matrix.isError)
    return (
      <EmptyState
        tone="error"
        title="Không tải được ma trận quyền"
        description={
          matrix.error instanceof Error ? matrix.error.message : "Vui lòng thử tải lại trang."
        }
      />
    );

  if (matrix.isLoading) return <EmptyState title="Đang tải ma trận quyền…" />;

  const columns: AdminColumn[] = [
    { key: "action", label: "Hành động", className: "w-[34%]" },
    ...positions.map((position) => ({ key: position, label: position })),
  ];

  return (
    <div className="space-y-3">
      <div className="max-w-xs space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Ban
        </span>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger aria-label="Chọn ban" className="h-9 rounded-xl text-xs shadow-xs">
            <SelectValue>{departmentLabel(department)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DEPARTMENTS_KEY}>
              {departmentLabel(ALL_DEPARTMENTS_KEY)}
            </SelectItem>
            {DEPARTMENT_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {departmentLabel(id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {department === ALL_DEPARTMENTS_KEY && (
          <p className="text-xs text-muted-foreground">
            Áp cho cùng chức vụ ở mọi ban, trừ Ban Điều hành. Từng ban có thể cấp thêm.
          </p>
        )}
      </div>

      <AdminTable columns={columns} minWidth="min-w-[760px]">
        {actionGroups().map((group) => (
          <Fragment key={group.module}>
            <tr>
              <td
                colSpan={columns.length}
                className="bg-secondary/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {group.label}
              </td>
            </tr>
            {group.actions.map((action) => (
              <AdminTableRow key={action.code}>
                <td className="p-3">
                  <p className="font-medium text-foreground">{action.label}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{action.code}</p>
                </td>
                {positions.map((position) => {
                  const { own, inherited } = cellState(rows, department, position, action.code);
                  return (
                    <td key={position} className="p-3 align-top">
                      <Select
                        value={own ?? "none"}
                        onValueChange={(value) => void save(position, action.code, value)}
                        disabled={!!saving[cellKey(department, position, action.code)]}
                      >
                        <SelectTrigger
                          aria-label={`${action.label}: ${position}`}
                          className="h-8 text-xs"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Không</SelectItem>
                          {action.scoped ? (
                            <>
                              <SelectItem value="own">Ban mình</SelectItem>
                              <SelectItem value="all">Toàn bộ</SelectItem>
                            </>
                          ) : (
                            <SelectItem value="all">Có</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {inherited !== null && own === null && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Từ Tất cả các ban: {scopeLabel(inherited, action.scoped)}
                        </p>
                      )}
                    </td>
                  );
                })}
              </AdminTableRow>
            ))}
          </Fragment>
        ))}
      </AdminTable>
    </div>
  );
}
