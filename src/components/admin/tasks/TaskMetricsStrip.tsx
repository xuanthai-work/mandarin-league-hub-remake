import { AlarmClock, BadgeCheck, ClipboardCheck, ListChecks } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { isDueSoon, type Task } from "./shared";

interface MetricCardProps {
  label: string;
  value: number;
  hint: string;
  icon: ReactNode;
  tone: string;
  pulse?: boolean;
}

function MetricCard({ label, value, hint, icon, tone, pulse }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {pulse && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
          )}
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

export function TaskMetricsStrip({ tasks }: { tasks: Task[] }) {
  const submitted = tasks.filter((t) => t.status === "submitted").length;
  const active = tasks.filter((t) => t.status === "in_progress" || t.status === "assigned").length;
  const dueSoon = tasks.filter(isDueSoon).length;
  const done = tasks.filter((t) => t.status === "done");
  const donePoints = done.reduce((sum, t) => sum + (t.points || 0), 0);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="Cần nghiệm thu"
        value={submitted}
        hint={submitted ? "Có báo cáo đang chờ duyệt" : "Không có báo cáo chờ duyệt"}
        tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        pulse={submitted > 0}
        icon={<ClipboardCheck aria-hidden className="h-4 w-4" />}
      />
      <MetricCard
        label="Đang thực hiện"
        value={active}
        hint="Đã giao hoặc đang làm"
        tone="bg-primary/10 text-primary"
        icon={<ListChecks aria-hidden className="h-4 w-4" />}
      />
      <MetricCard
        label="Quá hạn / Sắp đến hạn"
        value={dueSoon}
        hint="Hạn trong 24h hoặc đã quá hạn"
        tone="bg-rose-500/10 text-rose-600 dark:text-rose-400"
        icon={<AlarmClock aria-hidden className="h-4 w-4" />}
      />
      <MetricCard
        label="Đã hoàn thành"
        value={done.length}
        hint={`+${donePoints} điểm cống hiến đã cấp`}
        tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        icon={<BadgeCheck aria-hidden className="h-4 w-4" />}
      />
    </div>
  );
}
