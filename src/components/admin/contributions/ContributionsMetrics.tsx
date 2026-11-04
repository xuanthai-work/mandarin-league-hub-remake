import type { ReactNode } from "react";
import { CalendarCheck2, ClipboardCheck, Coins, ShieldAlert, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { dayKey, monthStart, shiftMonth, type PointStatRow } from "./shared";

interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
  children?: ReactNode;
}

function MetricCard({ label, value, hint, icon: Icon, tone, children }: MetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-gold/60 via-gold/20 to-transparent"
      />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", tone)}>
          <Icon aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-2 font-mono text-2xl font-bold leading-none tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}

/** Five weekly buckets of positive points for the current month. */
function weeklyBuckets(rows: PointStatRow[]) {
  const buckets = [0, 0, 0, 0, 0];
  rows.forEach((t) => {
    if (t.delta <= 0) return;
    const day = new Date(t.created_at).getDate();
    const index = Math.min(4, Math.max(0, Math.floor((day - 1) / 7)));
    buckets[index] = (buckets[index] ?? 0) + t.delta;
  });
  return buckets;
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? 100 / (values.length - 1) : 100;
  const points = values
    .map((value, index) => `${(index * step).toFixed(1)},${(30 - (value / max) * 26).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden
      className="mt-2 h-7 w-full text-primary/70"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface ContributionsMetricsProps {
  rows: PointStatRow[];
  totalMembers: number;
  loading: boolean;
}

/**
 * Executive summary strip. Values are derived from the transactions the current
 * account may read (RLS already scopes heads to their own department).
 */
export function ContributionsMetrics({ rows, totalMembers, loading }: ContributionsMetricsProps) {
  const now = new Date();
  const thisStart = monthStart(now).getTime();
  const prevStart = shiftMonth(monthStart(now), -1).getTime();

  const monthRows = rows.filter((t) => new Date(t.created_at).getTime() >= thisStart);
  const prevRows = rows.filter((t) => {
    const time = new Date(t.created_at).getTime();
    return time >= prevStart && time < thisStart;
  });

  const monthPlus = monthRows.reduce((sum, t) => (t.delta > 0 ? sum + t.delta : sum), 0);
  const prevPlus = prevRows.reduce((sum, t) => (t.delta > 0 ? sum + t.delta : sum), 0);
  const monthMinus = Math.abs(monthRows.reduce((sum, t) => (t.delta < 0 ? sum + t.delta : sum), 0));
  const penaltyCases = monthRows.filter((t) => t.kind === "penalty").length;
  const taskRows = monthRows.filter((t) => t.kind === "task");
  const taskPoints = taskRows.reduce((sum, t) => (t.delta > 0 ? sum + t.delta : sum), 0);

  const attendance = monthRows.filter((t) => t.kind === "attendance" && t.delta > 0);
  const attendedMembers = new Set(attendance.map((t) => t.member_id)).size;
  const sessions = new Set(attendance.map((t) => `${dayKey(t.created_at)}|${t.reason}`)).size;
  const attendanceRate = totalMembers > 0 ? Math.round((attendedMembers / totalMembers) * 100) : 0;

  const mom = prevPlus > 0 ? Math.round(((monthPlus - prevPlus) / prevPlus) * 100) : null;
  const momText =
    mom === null
      ? "Chưa có dữ liệu tháng trước"
      : `${mom >= 0 ? "Tăng" : "Giảm"} ${Math.abs(mom)}% so với tháng trước`;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[118px] animate-pulse rounded-2xl border border-border/70 bg-card"
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
        hint={`Tháng này · ${momText}`}
        icon={Coins}
        tone="bg-primary/10 text-primary"
      >
        <Sparkline values={weeklyBuckets(monthRows)} />
      </MetricCard>
      <MetricCard
        label="Chuyên cần điểm danh"
        value={`${attendanceRate}%`}
        hint={`${attendedMembers}/${totalMembers} thành viên · ${sessions} buổi ghi nhận`}
        icon={CalendarCheck2}
        tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      />
      <MetricCard
        label="Kỷ luật & trừ điểm"
        value={monthMinus > 0 ? `-${monthMinus.toLocaleString("vi-VN")}` : "0"}
        hint={`${penaltyCases} trường hợp trừ điểm trong tháng`}
        icon={ShieldAlert}
        tone="bg-rose-500/10 text-rose-600 dark:text-rose-400"
      />
      <MetricCard
        label="Nhiệm vụ nghiệm thu"
        value={taskRows.length.toLocaleString("vi-VN")}
        hint={`+${taskPoints.toLocaleString("vi-VN")} điểm từ nhiệm vụ hoàn thành`}
        icon={ClipboardCheck}
        tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
      />
    </div>
  );
}
