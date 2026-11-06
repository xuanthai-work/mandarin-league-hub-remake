import type { ReactNode } from "react";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "gold";

const TONE: Record<StatusTone, { pill: string; dot: string }> = {
  neutral: {
    pill: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  info: { pill: "bg-primary/10 text-primary", dot: "bg-primary" },
  success: { pill: "bg-success/15 text-success", dot: "bg-success" },
  warning: {
    pill: "bg-warning-soft text-warning-foreground",
    dot: "bg-warning-foreground",
  },
  danger: { pill: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
  gold: { pill: "bg-gold-soft text-warning-foreground", dot: "bg-gold" },
};

/** Nhãn trạng thái chuẩn của admin: nền nhạt, chấm màu, chữ 11px. */
export function StatusPill({
  tone,
  children,
  dot = true,
  className = "",
}: {
  tone: StatusTone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.pill} ${className}`}
    >
      {dot && <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />}
      {children}
    </span>
  );
}
