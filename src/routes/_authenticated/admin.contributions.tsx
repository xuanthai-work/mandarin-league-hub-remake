import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ClipboardCheck, Zap } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdjustmentModal } from "@/components/admin/contributions/AdjustmentModal";
import { AttendanceModal } from "@/components/admin/contributions/AttendanceModal";
import { ContributionsMetrics } from "@/components/admin/contributions/ContributionsMetrics";
import { LeaderboardPanel } from "@/components/admin/contributions/LeaderboardPanel";
import { TransactionLedger } from "@/components/admin/contributions/TransactionLedger";
import {
  monthStart,
  shiftMonth,
  type PointMember,
  type PointStatRow,
  type PointTxn,
} from "@/components/admin/contributions/shared";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/contributions")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Điểm đóng góp | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: PointsPage,
});

const LEDGER_LIMIT = 500;

function PointsPage() {
  const qc = useQueryClient();
  const access = useAdminAccess();
  const isAdmin = access.data?.roles.includes("admin") ?? false;
  const ownDept = access.data?.department ?? null;

  const members = useQuery({
    queryKey: ["points-members"],
    queryFn: async () =>
      ((
        await supabase
          .from("members")
          .select("id, full_name, member_code, department, position, contribution_points, status")
          .order("contribution_points", { ascending: false })
      ).data ?? []) as PointMember[],
  });

  const roleMap = useQuery({
    queryKey: ["points-roles"],
    queryFn: async () => {
      const accounts =
        (await supabase.from("member_accounts").select("member_id, user_id")).data ?? [];
      const roles = (await supabase.from("user_roles").select("user_id, role")).data ?? [];
      const map: Record<string, string[]> = {};
      accounts.forEach((account) => {
        map[account.member_id] = roles
          .filter((role) => role.user_id === account.user_id)
          .map((role) => String(role.role));
      });
      return map;
    },
  });

  const advisorIds = useQuery({
    queryKey: ["points-advisors"],
    queryFn: async () =>
      new Set(
        (
          (await supabase.from("department_advisors").select("member_id").eq("is_active", true))
            .data ?? []
        ).map((advisor) => advisor.member_id),
      ),
  });

  const history = useQuery({
    queryKey: ["points-history"],
    queryFn: async () =>
      ((
        await supabase
          .from("point_transactions")
          .select(
            "id, member_id, delta, reason, kind, task_id, balance_after, actor_name, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(LEDGER_LIMIT)
      ).data ?? []) as PointTxn[],
  });

  // Month-over-month KPIs need the previous month even when the ledger's 500-row window is full.
  const statsSince = useMemo(() => shiftMonth(monthStart(new Date()), -1).toISOString(), []);
  const stats = useQuery({
    queryKey: ["points-stats", statsSince],
    queryFn: async () =>
      ((
        await supabase
          .from("point_transactions")
          .select("member_id, delta, kind, reason, created_at")
          .gte("created_at", statsSince)
      ).data ?? []) as PointStatRow[],
  });

  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["points-members"] });
    qc.invalidateQueries({ queryKey: ["points-history"] });
    qc.invalidateQueries({ queryKey: ["points-stats"] });
  };

  const memberList = useMemo(() => members.data ?? [], [members.data]);
  // Inactive members keep their historical transactions in the ledger but never join the roster or podium.
  const activeMembers = useMemo(
    () => memberList.filter((m) => m.status === "active"),
    [memberList],
  );

  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAttendanceOpen(true)}
          aria-label="Điểm danh cuộc họp"
          title="Điểm danh cuộc họp"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:px-3.5"
        >
          <ClipboardCheck aria-hidden className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Điểm danh cuộc họp</span>
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setAdjustOpen(true)}
            aria-label="Thưởng hoặc trừ điểm"
            title="Thưởng / Trừ điểm"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:px-3.5"
          >
            <Zap aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">Thưởng / Trừ điểm</span>
          </button>
        )}
      </div>
    ),
    [isAdmin],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <AdminPageHeader
        title="Điểm đóng góp"
        description="Điều hành điểm cống hiến: bảng vinh danh, điểm danh hàng loạt và sổ cái kiểm toán đầy đủ."
        actions={headerActions}
      />

      <ContributionsMetrics
        rows={stats.data ?? history.data ?? []}
        totalMembers={activeMembers.length}
        loading={stats.isLoading && history.isLoading}
      />

      <LeaderboardPanel
        members={activeMembers}
        roleMap={roleMap.data}
        advisorIds={advisorIds.data}
        loading={members.isLoading}
      />

      <TransactionLedger
        rows={history.data ?? []}
        members={memberList}
        loading={history.isLoading}
        capped={(history.data?.length ?? 0) >= LEDGER_LIMIT}
      />

      {attendanceOpen && (
        <AttendanceModal
          members={activeMembers}
          isAdmin={isAdmin}
          ownDept={ownDept}
          onClose={() => setAttendanceOpen(false)}
          onDone={refresh}
        />
      )}

      {adjustOpen && isAdmin && (
        <AdjustmentModal
          members={activeMembers}
          onClose={() => setAdjustOpen(false)}
          onDone={refresh}
        />
      )}
    </div>
  );
}
