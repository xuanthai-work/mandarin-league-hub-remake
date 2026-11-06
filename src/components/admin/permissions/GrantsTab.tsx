import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { useConfirm } from "@/components/admin/kit/useConfirm";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PERMISSION_ACTIONS, type PermissionScope } from "@/lib/permission-catalog";
import { formatDay, grantStatus, scopeLabel, type GrantStatus } from "@/lib/permission-admin";
import { deptName } from "@/lib/recruitment";
import { matchesSearch } from "@/lib/search";
import { GrantModal, type MemberRow } from "./GrantModal";

type Grant = {
  id: string;
  member_id: string;
  action: string;
  scope: string;
  expires_at: string | null;
  revoked_at: string | null;
  note: string;
};

const STATUS_META: Record<GrantStatus, { tone: "success" | "neutral" | "danger"; label: string }> =
  {
    active: { tone: "success", label: "Đang hiệu lực" },
    expired: { tone: "neutral", label: "Hết hạn" },
    revoked: { tone: "danger", label: "Đã thu hồi" },
  };

const COLUMNS: AdminColumn[] = [
  { key: "member", label: "Thành viên", className: "w-[26%]" },
  { key: "action", label: "Quyền", className: "w-[22%]" },
  { key: "scope", label: "Phạm vi", className: "w-[10%]" },
  { key: "expires", label: "Hết hạn", className: "w-[12%]" },
  { key: "status", label: "Trạng thái", className: "w-[12%]" },
  { key: "note", label: "Ghi chú", className: "w-[12%]" },
  { key: "actions", label: "Thao tác", srOnly: true, className: "w-[6%] text-right" },
];

export function GrantsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { confirm, dialog } = useConfirm();

  const grants = useQuery({
    queryKey: ["permission-grants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_permission_grants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Grant[];
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

  const rows = useMemo(
    () =>
      (grants.data ?? []).filter((g) => {
        if (filter === "active" && grantStatus(g) !== "active") return false;
        if (!q.trim()) return true;
        const member = memberById.get(g.member_id);
        return matchesSearch(member?.full_name, q) || matchesSearch(member?.member_code, q);
      }),
    [grants.data, memberById, filter, q],
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["permission-grants"] });
    qc.invalidateQueries({ queryKey: ["permission-audit"] });
  };

  const revoke = async (grant: Grant) => {
    const member = memberById.get(grant.member_id);
    const label = PERMISSION_ACTIONS.find((a) => a.code === grant.action)?.label ?? grant.action;
    const ok = await confirm({
      title: "Thu hồi quyền riêng?",
      description: `${member?.full_name ?? "Thành viên"} sẽ mất quyền “${label}” ngay lập tức.`,
      confirmLabel: "Thu hồi",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.rpc("admin_revoke_permission_grant", {
      _grant: grant.id,
      _note: "",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã thu hồi quyền riêng");
    refresh();
  };

  if (grants.isError)
    return (
      <EmptyState
        tone="error"
        title="Không tải được danh sách quyền riêng"
        description={grants.error instanceof Error ? grants.error.message : "Vui lòng thử lại."}
      />
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Lọc trạng thái"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "active", label: "Đang hiệu lực" },
            { value: "all", label: "Tất cả" },
          ]}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tìm theo tên hoặc mã thành viên…"
          label="Tìm quyền riêng"
        />
        <Button
          type="button"
          size="admin"
          className="ml-auto"
          onClick={() => setOpen(true)}
          disabled={members.isLoading}
        >
          <Plus aria-hidden />
          Cấp quyền riêng
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={
            q.trim() || filter !== "active" ? "Không có kết quả phù hợp" : "Chưa có quyền riêng nào"
          }
        />
      ) : (
        <AdminTable columns={COLUMNS} minWidth="min-w-[900px]">
          {rows.map((grant) => {
            const member = memberById.get(grant.member_id);
            const meta = PERMISSION_ACTIONS.find((a) => a.code === grant.action);
            const status = STATUS_META[grantStatus(grant)];
            return (
              <AdminTableRow key={grant.id}>
                <td className="p-3">
                  <p className="font-medium text-foreground">{member?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {member?.member_code ?? "—"}
                    {member?.department ? ` · ${deptName(member.department)}` : ""}
                    {member?.position ? ` · ${member.position}` : ""}
                  </p>
                </td>
                <td className="p-3">{meta?.label ?? grant.action}</td>
                <td className="p-3 text-xs">
                  {scopeLabel(grant.scope as PermissionScope, meta?.scoped ?? false)}
                </td>
                <td className="p-3 text-xs">
                  {grant.expires_at ? formatDay(grant.expires_at) : "Không thời hạn"}
                </td>
                <td className="p-3">
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{grant.note || "—"}</td>
                <td className="p-3 text-right">
                  {grantStatus(grant) === "active" && (
                    <Button
                      type="button"
                      size="admin"
                      variant="destructive-outline"
                      onClick={() => void revoke(grant)}
                    >
                      Thu hồi
                    </Button>
                  )}
                </td>
              </AdminTableRow>
            );
          })}
        </AdminTable>
      )}

      <AnimatePresence>
        {open && (
          <GrantModal
            members={members.data ?? []}
            onClose={() => setOpen(false)}
            onDone={() => {
              refresh();
              setOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {dialog}
    </div>
  );
}
