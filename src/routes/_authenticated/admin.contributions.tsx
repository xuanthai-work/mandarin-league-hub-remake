import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ClipboardCheck, Zap } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdjustmentModal } from "@/components/admin/contributions/AdjustmentModal";
import { AttendanceModal } from "@/components/admin/contributions/AttendanceModal";
import { ContributionsMetrics } from "@/components/admin/contributions/ContributionsMetrics";
import { LeaderboardPanel } from "@/components/admin/contributions/LeaderboardPanel";
import { TransactionLedger } from "@/components/admin/contributions/TransactionLedger";
import {
  monthStart,
  shiftMonth,
  type LedgerFilters,
  type PointMember,
  type PointStatRow,
  type PointTxn,
} from "@/components/admin/contributions/shared";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getActiveAccountMemberIds } from "@/lib/accounts.functions";
import { canAdjustMember, hasAllScope } from "@/lib/admin-permissions";
import { can, NO_PERMISSIONS } from "@/lib/permission-catalog";
import { isFounder } from "@/lib/points";
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
  const perms = access.data?.perms ?? NO_PERMISSIONS;
  const me = useMemo(
    () => ({
      department: access.data?.department ?? null,
      position: access.data?.position ?? null,
    }),
    [access.data?.department, access.data?.position],
  );
  const canAttend = can(perms, "points.attendance");
  const attendAllDepts = hasAllScope(perms, "points.attendance");
  const canAdjust = can(perms, "points.adjust");
  const ownDept = me.department;

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

  const fetchActiveAccountIds = useServerFn(getActiveAccountMemberIds);
  const activeAccountIds = useQuery({
    queryKey: ["points-active-accounts"],
    queryFn: async () => new Set(await fetchActiveAccountIds()),
  });

  const history = useQuery({
    queryKey: ["points-history"],
    queryFn: async () => {
      const base =
        "id, member_id, delta, reason, kind, task_id, balance_after, actor_name, created_at";
      const first = await supabase
        .from("point_transactions")
        .select(`${base}, evidence_paths`)
        .order("created_at", { ascending: false })
        .limit(LEDGER_LIMIT);
      if (!first.error) return (first.data ?? []) as PointTxn[];
      // Older database without `evidence_paths`: keep the ledger usable, just without files.
      const fallback = await supabase
        .from("point_transactions")
        .select(base)
        .order("created_at", { ascending: false })
        .limit(LEDGER_LIMIT);
      return (fallback.data ?? []) as PointTxn[];
    },
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
  const [appliedFilter, setAppliedFilter] = useState<{
    filter: Partial<LedgerFilters>;
    stamp: number;
  } | null>(null);

  /** Metric card drill-down: filter the ledger and bring it into view. */
  const handleMetricClick = (filter: Partial<LedgerFilters>) => {
    setAppliedFilter({ filter, stamp: Date.now() });
    document
      .getElementById("transaction-ledger")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["points-members"] });
    qc.invalidateQueries({ queryKey: ["points-history"] });
    qc.invalidateQueries({ queryKey: ["points-stats"] });
    qc.invalidateQueries({ queryKey: ["points-active-accounts"] });
  };

  const memberList = useMemo(() => members.data ?? [], [members.data]);
  /**
   * Only a member with an active profile AND an activated internal account joins the roster,
   * podium, attendance and bonus/penalty pickers. Everyone else stays on /admin/members.
   * Historical transactions remain in the ledger.
   */
  const activeMembers = useMemo(() => {
    const ids = activeAccountIds.data ?? new Set<string>();
    return memberList.filter((m) => m.status === "active" && ids.has(m.id));
  }, [memberList, activeAccountIds.data]);

  /**
   * Founders hold the symbolic "Lãnh đạo" tier, not a contribution rank, so they stay off the
   * leaderboard while advisors and heads keep competing with everyone else.
   */
  const boardMembers = useMemo(
    () => activeMembers.filter((m) => !isFounder(m.position)),
    [activeMembers],
  );

  /** Bonus/penalty targets: same scope as points.adjust and strictly lower position. */
  const adjustableMembers = useMemo(
    () => activeMembers.filter((m) => canAdjustMember(perms, me, m)),
    [activeMembers, perms, me],
  );

  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        {canAttend && (
          <Button
            type="button"
            size="admin"
            variant="outline"
            onClick={() => setAttendanceOpen(true)}
            aria-label="Điểm danh cuộc họp"
            title="Điểm danh cuộc họp"
          >
            <ClipboardCheck aria-hidden />
            <span className="hidden sm:inline">Điểm danh cuộc họp</span>
          </Button>
        )}
        {canAdjust && (
          <Button
            type="button"
            size="admin"
            onClick={() => setAdjustOpen(true)}
            aria-label="Thưởng hoặc trừ điểm"
            title="Thưởng / Trừ điểm"
          >
            <Zap aria-hidden />
            <span className="hidden sm:inline">Thưởng / Trừ điểm</span>
          </Button>
        )}
      </div>
    ),
    [canAttend, canAdjust],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Điểm đóng góp"
        description="Điều hành điểm cống hiến: bảng vinh danh, điểm danh hàng loạt và sổ cái kiểm toán đầy đủ."
        actions={headerActions}
      />

      <ContributionsMetrics
        rows={stats.data ?? history.data ?? []}
        totalMembers={activeMembers.length}
        loading={stats.isLoading && history.isLoading}
        onFilterSelect={handleMetricClick}
      />

      <LeaderboardPanel
        members={boardMembers}
        loading={members.isLoading || activeAccountIds.isLoading}
      />

      <TransactionLedger
        rows={history.data ?? []}
        members={memberList}
        loading={history.isLoading}
        capped={(history.data?.length ?? 0) >= LEDGER_LIMIT}
        appliedFilter={appliedFilter}
      />

      {attendanceOpen && canAttend && (
        <AttendanceModal
          members={activeMembers}
          allDepts={attendAllDepts}
          ownDept={ownDept}
          onClose={() => setAttendanceOpen(false)}
          onDone={refresh}
        />
      )}

      <AnimatePresence>
        {adjustOpen && canAdjust && (
          <AdjustmentModal
            members={adjustableMembers}
            onClose={() => setAdjustOpen(false)}
            onDone={refresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
