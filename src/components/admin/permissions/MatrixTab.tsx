import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENT_IDS, PERMISSION_ACTIONS } from "@/lib/permission-catalog";
import {
  actionGroups,
  actionHolders,
  actionMatches,
  cellScope,
  countGranted,
  positionsFor,
  scopeLabel,
  type ActionMeta,
  type MatrixRow,
} from "@/lib/permission-admin";
import { deptName } from "@/lib/recruitment";

const cellKey = (department: string, position: string, action: string) =>
  `${department}|${position}|${action}`;

/** Pill colours of the read-only permission label in a matrix cell. */
function scopeTone(value: string): string {
  if (value === "own") return "bg-warning-soft text-warning-foreground";
  if (value === "all") return "bg-primary/10 text-primary";
  return "bg-transparent text-muted-foreground/60";
}

/** Read-only "Ai có" cell of the per-action view. */
function HoldersCell({ action, rows }: { action: ActionMeta; rows: MatrixRow[] }) {
  const holders = actionHolders(rows, action.code);
  if (holders.length === 0)
    return (
      <td className="p-3">
        <StatusPill tone="neutral" dot={false}>
          Chỉ Quản trị viên
        </StatusPill>
      </td>
    );
  return (
    <td className="p-3">
      <div className="flex flex-wrap gap-1.5">
        {holders.map((holder) => (
          <StatusPill
            key={holder.label}
            dot={false}
            tone={action.scoped ? (holder.scope === "all" ? "info" : "warning") : "info"}
          >
            {action.scoped
              ? `${holder.label} · ${holder.scope === "all" ? "toàn tổ chức" : "ban mình"}`
              : holder.label}
          </StatusPill>
        ))}
      </div>
    </td>
  );
}

export function MatrixTab() {
  const qc = useQueryClient();
  const [view, setView] = useState<"dept" | "action">("dept");
  const [department, setDepartment] = useState<string>("hr");
  const [q, setQ] = useState("");
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
  const groups = actionGroups()
    .map((group) => ({
      ...group,
      actions: group.actions.filter((action) => actionMatches(action, q)),
    }))
    .filter((group) => group.actions.length > 0);

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

  const deptColumns: AdminColumn[] = [
    { key: "action", label: "Hành động", className: "w-[34%]" },
    ...positions.map((position) => ({ key: position, label: position, className: "text-center" })),
  ];
  const actionColumns: AdminColumn[] = [
    { key: "action", label: "Hành động", className: "w-[34%]" },
    { key: "who", label: "Ai có (ngoài Quản trị viên)" },
  ];
  const columns = view === "dept" ? deptColumns : actionColumns;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Cách xem"
          value={view}
          onChange={setView}
          options={[
            { value: "dept", label: "Theo ban" },
            { value: "action", label: "Theo hành động" },
          ]}
        />
        {view === "dept" && (
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger aria-label="Chọn ban" className="h-9 w-64 rounded-xl text-xs shadow-xs">
              <SelectValue>{deptName(department)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENT_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {deptName(id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tìm hành động hoặc mã…"
          label="Tìm hành động"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <StatusPill tone="info" dot={false}>
            Toàn tổ chức
          </StatusPill>
          dữ liệu mọi ban
        </span>
        <span className="inline-flex items-center gap-1.5">
          <StatusPill tone="warning" dot={false}>
            Ban mình
          </StatusPill>
          chỉ dữ liệu của ban mình
        </span>
        <span className="inline-flex items-center gap-1.5">
          <StatusPill tone="info" dot={false}>
            Có
          </StatusPill>
          hành động không chia theo ban
        </span>
        <span>Quản trị viên luôn có mọi quyền.</span>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="Không có hành động khớp từ khóa." />
      ) : (
        <AdminTable columns={columns} minWidth="min-w-[760px]">
          {groups.map((group) => (
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
                    <p className="font-medium text-foreground">
                      {action.label}
                      {action.scoped && (
                        <span className="ml-1.5 text-[11px] font-semibold text-warning-foreground">
                          theo ban
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">{action.code}</p>
                  </td>

                  {view === "dept" ? (
                    positions.map((position) => {
                      const scope = cellScope(rows, department, position, action.code);
                      const value = scope ?? "none";
                      return (
                        <td key={position} className="p-3 text-center">
                          <Select
                            value={value}
                            onValueChange={(next) => void save(position, action.code, next)}
                            disabled={!!saving[cellKey(department, position, action.code)]}
                          >
                            <SelectTrigger
                              aria-label={`${action.label}: ${position}`}
                              className={`mx-auto h-7 w-auto min-w-[7.5rem] justify-center gap-1 rounded-full border-transparent px-3 text-[11px] font-semibold shadow-none ${scopeTone(value)}`}
                            >
                              <SelectValue>
                                {value === "none" ? "—" : scopeLabel(scope, action.scoped)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Không</SelectItem>
                              {action.scoped ? (
                                <>
                                  <SelectItem value="own">Ban mình</SelectItem>
                                  <SelectItem value="all">Toàn tổ chức</SelectItem>
                                </>
                              ) : (
                                <SelectItem value="all">Có</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </td>
                      );
                    })
                  ) : (
                    <HoldersCell action={action} rows={rows} />
                  )}
                </AdminTableRow>
              ))}
            </Fragment>
          ))}

          {view === "dept" && (
            <AdminTableRow className="bg-secondary/30 font-semibold">
              <td className="p-3">Số hành động có quyền</td>
              {positions.map((position) => (
                <td key={position} className="p-3 text-center tabular-nums">
                  {countGranted(rows, department, position)}/{PERMISSION_ACTIONS.length}
                </td>
              ))}
            </AdminTableRow>
          )}
        </AdminTable>
      )}
    </div>
  );
}
