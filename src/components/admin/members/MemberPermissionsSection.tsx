import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { GrantModal } from "@/components/admin/permissions/GrantModal";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { useConfirm } from "@/components/admin/kit/useConfirm";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { PermissionScope } from "@/lib/permission-catalog";
import {
  formatDay,
  groupMemberPermissions,
  scopeLabel,
  type ActionMeta,
  type MemberPermissionRow,
} from "@/lib/permission-admin";
import { deptName } from "@/lib/recruitment";

type Props = {
  member: {
    id: string;
    full_name: string;
    member_code: string;
    department: string;
    position: string;
    status: string;
  };
  /** The member holds the admin flag (only known when the viewer can see accounts). */
  targetIsAdmin: boolean;
  /** Viewer is an admin: may grant / revoke personal permissions and open the matrix. */
  canGrant: boolean;
};

function ScopePill({ meta, row }: { meta: ActionMeta; row: MemberPermissionRow }) {
  const scoped = meta.scoped;
  return (
    <StatusPill dot={false} tone={scoped ? (row.scope === "all" ? "info" : "warning") : "info"}>
      {scoped ? `${meta.label} · ${scopeLabel(row.scope as PermissionScope, true)}` : meta.label}
    </StatusPill>
  );
}

export function MemberPermissionsSection({ member, targetIsAdmin, canGrant }: Props) {
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const [granting, setGranting] = useState(false);

  const perms = useQuery({
    queryKey: ["member-permissions", member.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("member_permissions", { _member: member.id });
      if (error) throw error;
      return (data ?? []) as MemberPermissionRow[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["member-permissions", member.id] });
    qc.invalidateQueries({ queryKey: ["permission-grants"] });
    qc.invalidateQueries({ queryKey: ["permission-audit"] });
  };

  const rows = perms.data ?? [];
  const matrixGroups = groupMemberPermissions(rows, "matrix");
  const grants = groupMemberPermissions(rows, "grant").flatMap((g) => g.items);

  const revoke = async (meta: ActionMeta, row: MemberPermissionRow) => {
    const ok = await confirm({
      title: "Thu hồi quyền riêng?",
      description: `${member.full_name} sẽ mất quyền “${meta.label}” ngay lập tức.`,
      confirmLabel: "Thu hồi",
      destructive: true,
    });
    if (!ok || !row.grant_id) return;
    const { error } = await supabase.rpc("admin_revoke_permission_grant", {
      _grant: row.grant_id,
      _note: "",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã thu hồi quyền riêng");
    refresh();
  };

  return (
    <section className="space-y-4 border-t border-border/60 pt-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quyền quản trị
        </h3>
        {canGrant && (
          <Button asChild variant="link" size="admin-sm">
            <Link to="/admin/permissions">Sửa ma trận</Link>
          </Button>
        )}
      </div>

      {targetIsAdmin && (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
          Người này là Quản trị viên: có mọi quyền, không phụ thuộc danh sách dưới đây.
        </p>
      )}

      {perms.isLoading && <p className="text-xs text-muted-foreground">Đang tải quyền…</p>}
      {perms.isError && (
        <p className="text-xs text-destructive">
          Không tải được quyền:{" "}
          {perms.error instanceof Error ? perms.error.message : "Vui lòng thử lại."}
        </p>
      )}

      {!perms.isLoading && !perms.isError && (
        <>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">
              Theo chức vụ · {member.position} · {deptName(member.department)}
            </h4>
            {matrixGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Chức vụ này chưa có quyền quản trị nào.
              </p>
            ) : (
              matrixGroups.map((group) => (
                <div key={group.module} className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map(({ meta, row }, index) => (
                      <ScopePill key={`${meta.code}-${index}`} meta={meta} row={row} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground">Quyền riêng</h4>
              {canGrant && member.status === "active" && (
                <Button
                  type="button"
                  size="admin-sm"
                  variant="outline"
                  onClick={() => setGranting(true)}
                >
                  <Plus aria-hidden /> Cấp quyền riêng
                </Button>
              )}
            </div>
            {grants.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Chưa có quyền riêng nào đang hiệu lực.
              </p>
            ) : (
              grants.map(({ meta, row }, index) => (
                <div
                  key={row.grant_id ?? `${meta.code}-${index}`}
                  className="rounded-lg border border-border p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{meta.label}</span>
                      <ScopePill meta={meta} row={row} />
                    </div>
                    {canGrant && row.grant_id && (
                      <Button
                        type="button"
                        size="admin-sm"
                        variant="destructive-outline"
                        onClick={() => void revoke(meta, row)}
                      >
                        Thu hồi
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {[
                      row.expires_at ? `Hết hạn ${formatDay(row.expires_at)}` : "Không thời hạn",
                      row.granted_by_label ? `Cấp bởi ${row.granted_by_label}` : "",
                      row.note,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {granting && (
          <GrantModal
            members={[
              {
                id: member.id,
                full_name: member.full_name,
                member_code: member.member_code,
                department: member.department,
                position: member.position,
                status: member.status,
              },
            ]}
            fixedMemberId={member.id}
            onClose={() => setGranting(false)}
            onDone={() => {
              refresh();
              setGranting(false);
            }}
          />
        )}
      </AnimatePresence>
      {dialog}
    </section>
  );
}
