import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ClipboardCheck, Zap } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdjustmentModal } from "@/components/admin/contributions/AdjustmentModal";
import { ContributionsMetrics } from "@/components/admin/contributions/ContributionsMetrics";
import { LeaderboardPanel } from "@/components/admin/contributions/LeaderboardPanel";
import { MeetAttendanceModal } from "@/components/admin/contributions/MeetAttendanceModal";
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
import { canAdjustMember } from "@/lib/admin-permissions";
import { can, NO_PERMISSIONS } from "@/lib/permission-catalog";
import { useAvatarUrls } from "@/lib/avatars";
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
  const canAdjust = can(perms, "points.adjust");
  const canViewHistory = can(perms, "points.view");
  const canPick = canAttend || canAdjust;
  const manages = canViewHistory || canPick;

  const leaderboard = useQuery({
    queryKey: ["points-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("points_leaderboard");
      if (error) throw error;
      return (data ?? []).map((m) => ({ ...m, status: "active" })) as PointMember[];
    },
  });

  const members = useQuery({
    queryKey: ["points-members"],
    enabled: manages,
    queryFn: async () =>
      ((
        await supabase
          .from("members")
          .select(
            "id, full_name, member_code, department, position, contribution_points, status, is_leader, avatar_path",
          )
          .order("contribution_points", { ascending: false })
      ).data ?? []) as PointMember[],
  });

  const fetchActiveAccountIds = useServerFn(getActiveAccountMemberIds);
  const activeAccountIds = useQuery({
    queryKey: ["points-active-accounts"],
    enabled: manages,
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
    enabled: canViewHistory,
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
    qc.invalidateQueries({ queryKey: ["points-leaderboard"] });
    qc.invalidateQueries({ queryKey: ["points-members"] });
    qc.invalidateQueries({ queryKey: ["points-history"] });
    qc.invalidateQueries({ queryKey: ["points-stats"] });
    qc.invalidateQueries({ queryKey: ["points-active-accounts"] });
  };

  const memberList = useMemo(() => members.data ?? [], [members.data]);
  const ledgerMembers = useMemo(() => {
    const map = new Map<string, PointMember>();
    for (const m of [...(leaderboard.data ?? []), ...memberList]) map.set(m.id, m);
    return [...map.values()];
  }, [leaderboard.data, memberList]);

  /**
   * Only a member with an active profile AND an activated internal account, and is not a leader,
   * joins the roster, podium, attendance and bonus/penalty pickers. Everyone else stays on /admin/members.
   * Historical transactions remain in the ledger.
   */
  const activeMembers = useMemo(() => {
    const ids = activeAccountIds.data ?? new Set<string>();
    return memberList.filter((m) => m.status === "active" && !m.is_leader && ids.has(m.id));
  }, [memberList, activeAccountIds.data]);

  /**
   * Leaders hold the symbolic "Lãnh đạo" tier, not a contribution rank, so they stay off the
   * leaderboard while advisors and heads keep competing with everyone else. points_leaderboard()
   * already filters them out.
   */
  const boardMembers = useMemo(() => {
    /**
     * `points_leaderboard()` only returns avatar_path once migration 0079 is applied.
     * Managers can read the members table too, so fill the gap by id: the board still
     * shows faces on a database that has not run 0079 yet.
     */
    const readablePaths = new Map(memberList.map((m) => [m.id, m.avatar_path ?? null]));
    return (leaderboard.data ?? []).map((m) => ({
      ...m,
      avatar_path: m.avatar_path ?? readablePaths.get(m.id) ?? null,
    }));
  }, [leaderboard.data, memberList]);

  /** One signed batch for everyone shown on the board, the adjust and the attendance lists. */
  const { data: avatarMap } = useAvatarUrls(
    useMemo(
      () => [...boardMembers, ...memberList].map((m) => m.avatar_path),
      [boardMembers, memberList],
    ),
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
            aria-label="Điểm danh từ Google Meet"
            title="Điểm danh từ Google Meet"
          >
            <ClipboardCheck aria-hidden />
            <span className="hidden sm:inline">Điểm danh từ Google Meet</span>
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
        description={
          manages
            ? "Điều hành điểm cống hiến: bảng vinh danh, điểm danh từ Google Meet và sổ cái kiểm toán đầy đủ."
            : "Bảng vinh danh điểm cống hiến của cả Liên đoàn và lịch sử điểm của riêng bạn."
        }
        actions={headerActions}
      />

      {canViewHistory && (
        <ContributionsMetrics
          rows={stats.data ?? history.data ?? []}
          totalMembers={activeMembers.length}
          loading={stats.isLoading && history.isLoading}
          onFilterSelect={handleMetricClick}
        />
      )}

      <LeaderboardPanel
        members={boardMembers}
        avatarMap={avatarMap}
        loading={leaderboard.isLoading}
      />

      <TransactionLedger
        rows={history.data ?? []}
        members={ledgerMembers}
        loading={history.isLoading}
        capped={(history.data?.length ?? 0) >= LEDGER_LIMIT}
        title={canViewHistory ? "Sổ cái lịch sử điểm" : "Lịch sử điểm của tôi"}
        appliedFilter={appliedFilter}
      />

      <AnimatePresence>
        {attendanceOpen && canAttend && (
          <MeetAttendanceModal onClose={() => setAttendanceOpen(false)} onDone={refresh} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adjustOpen && canAdjust && (
          <AdjustmentModal
            members={adjustableMembers}
            avatarMap={avatarMap}
            onClose={() => setAdjustOpen(false)}
            onDone={refresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
