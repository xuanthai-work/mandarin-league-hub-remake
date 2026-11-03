import { BadgeCheck, CalendarClock, Clock3, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { CandidateApp } from "./shared";

interface MetricCardProps {
  label: string;
  value: number;
  hint: string;
  icon: ReactNode;
  tone: string;
}

function MetricCard({ label, value, hint, icon, tone }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", tone)}>
          {icon}
        </span>
      </div>
      <p className="mt-2 font-mono text-2xl font-bold leading-none text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * Recruitment funnel at a glance: each card answers "how many dossiers sit at this stage",
 * so a head can read the pipeline before touching the table.
 */
export function CandidateMetricsStrip({ apps }: { apps: CandidateApp[] }) {
  const total = apps.length;
  const pending = apps.filter((a) => a.status === "submitted" || a.status === "needs_info").length;
  const interviewing = apps.filter((a) => a.status === "interview").length;
  const approved = apps.filter((a) => a.status === "approved").length;
  const withCv = apps.filter((a) => !!a.cv_path).length;
  const cvRate = total ? Math.round((withCv / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="Tổng hồ sơ"
        value={total}
        hint={`${withCv} hồ sơ có CV (${cvRate}%)`}
        tone="bg-primary/10 text-primary"
        icon={<Inbox aria-hidden className="h-4 w-4" />}
      />
      <MetricCard
        label="Cần xem xét"
        value={pending}
        hint="Đã gửi hoặc cần bổ sung"
        tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        icon={<Clock3 aria-hidden className="h-4 w-4" />}
      />
      <MetricCard
        label="Vòng phỏng vấn"
        value={interviewing}
        hint="Đang ở bước phỏng vấn"
        tone="bg-purple-500/10 text-purple-600 dark:text-purple-400"
        icon={<CalendarClock aria-hidden className="h-4 w-4" />}
      />
      <MetricCard
        label="Đã kết nạp"
        value={approved}
        hint={`${total ? Math.round((approved / total) * 100) : 0}% tổng hồ sơ`}
        tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        icon={<BadgeCheck aria-hidden className="h-4 w-4" />}
      />
    </div>
  );
}
