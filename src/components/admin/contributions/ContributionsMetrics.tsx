import { CalendarCheck2, ClipboardCheck, Coins, ShieldAlert, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { dayKey, monthStart, type LedgerFilters, type PointStatRow } from "./shared";

interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
  /** When set the card becomes a drill-down shortcut for the ledger below. */
  onClick?: () => void;
}

function MetricCard({ label, value, hint, icon: Icon, tone, onClick }: MetricCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs sm:p-4",
        onClick &&
          "cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:translate-y-0",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold leading-none tabular-nums text-foreground">
            {value}
          </p>
        </div>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", tone)}>
          <Icon aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

interface ContributionsMetricsProps {
  rows: PointStatRow[];
  totalMembers: number;
  loading: boolean;
  /** Drill-down: apply the clicked metric's period/kind to the ledger. */
  onFilterSelect?: (filter: Partial<LedgerFilters>) => void;
}

/**
 * Executive summary strip. Values are derived from the transactions the current
 * account may read (RLS already scopes heads to their own department).
 */
export function ContributionsMetrics({
  rows,
  totalMembers,
  loading,
  onFilterSelect,
}: ContributionsMetricsProps) {
  const now = new Date();
  const thisStart = monthStart(now).getTime();

  const monthRows = rows.filter((t) => new Date(t.created_at).getTime() >= thisStart);

  const monthPlus = monthRows.reduce((sum, t) => (t.delta > 0 ? sum + t.delta : sum), 0);
  const monthMinus = Math.abs(monthRows.reduce((sum, t) => (t.delta < 0 ? sum + t.delta : sum), 0));
  const penaltyCases = monthRows.filter((t) => t.kind === "penalty").length;
  const taskRows = monthRows.filter((t) => t.kind === "task");
  const taskPoints = taskRows.reduce((sum, t) => (t.delta > 0 ? sum + t.delta : sum), 0);

  const attendance = monthRows.filter((t) => t.kind === "attendance" && t.delta > 0);
  const attendedMembers = new Set(attendance.map((t) => t.member_id)).size;
  const sessions = new Set(attendance.map((t) => `${dayKey(t.created_at)}|${t.reason}`)).size;
  const attendanceRate = totalMembers > 0 ? Math.round((attendedMembers / totalMembers) * 100) : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[102px] animate-pulse rounded-2xl border border-border/70 bg-card"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="Điểm đã cấp"
        value={monthPlus > 0 ? `+${monthPlus.toLocaleString("vi-VN")}` : "0"}
        hint="Tổng điểm đã cấp trong tháng này"
        icon={Coins}
        tone="bg-primary/10 text-primary"
        onClick={() => onFilterSelect?.({ period: "this", kind: "" })}
      />
      <MetricCard
        label="Chuyên cần điểm danh"
        value={`${attendanceRate}%`}
        hint={`${attendedMembers}/${totalMembers} thành viên · ${sessions} buổi ghi nhận`}
        icon={CalendarCheck2}
        tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        onClick={() => onFilterSelect?.({ period: "this", kind: "attendance" })}
      />
      <MetricCard
        label="Kỷ luật & trừ điểm"
        value={monthMinus > 0 ? `-${monthMinus.toLocaleString("vi-VN")}` : "0"}
        hint={`${penaltyCases} trường hợp trừ điểm trong tháng`}
        icon={ShieldAlert}
        tone="bg-rose-500/10 text-rose-600 dark:text-rose-400"
        onClick={() => onFilterSelect?.({ period: "this", kind: "penalty" })}
      />
      <MetricCard
        label="Nhiệm vụ nghiệm thu"
        value={taskRows.length.toLocaleString("vi-VN")}
        hint={`+${taskPoints.toLocaleString("vi-VN")} điểm từ nhiệm vụ hoàn thành`}
        icon={ClipboardCheck}
        tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        onClick={() => onFilterSelect?.({ period: "this", kind: "task" })}
      />
    </div>
  );
}
