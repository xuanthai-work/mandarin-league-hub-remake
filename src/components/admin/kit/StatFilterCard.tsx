import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type StatFilterCardProps = {
  label: string;
  value: ReactNode;
  /** Dòng phụ dưới con số. */
  hint?: ReactNode;
  icon?: LucideIcon;
  /** Có thì thẻ là nút bật/tắt bộ lọc (aria-pressed). Không có thì là thẻ tĩnh. */
  onToggle?: () => void;
  /** Bộ lọc của thẻ đang bật. */
  active?: boolean;
  /** Cần chú ý (ví dụ có bài chờ duyệt): viền vàng + chấm vàng cạnh nhãn. */
  attention?: boolean;
  className?: string;
};

/**
 * Thẻ số liệu chuẩn của admin, có thể dùng làm nút bật/tắt bộ lọc (aria-pressed).
 *
 * @example
 * <StatFilterCard
 *   label="Chờ duyệt"
 *   value={pendingCount}
 *   hint="Cần duyệt sớm"
 *   icon={Clock}
 *   attention={pendingCount > 0}
 *   active={status === "pending_review"}
 *   onToggle={() => setStatus((prev) => (prev === "pending_review" ? "" : "pending_review"))}
 * />
 */
export function StatFilterCard({
  label,
  value,
  hint,
  icon: Icon,
  onToggle,
  active = false,
  attention = false,
  className = "",
}: StatFilterCardProps) {
  const borderClass = active
    ? "border-primary ring-2 ring-primary/15"
    : attention
      ? "border-gold/60"
      : "border-border/70";

  const interactiveClass = onToggle
    ? "cursor-pointer hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    : "";

  const classes =
    `rounded-2xl border bg-card p-4 text-left shadow-2xs transition-all ${borderClass} ${interactiveClass} ${className}`.trim();

  const content = (
    <>
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {attention && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-gold" />}
        </div>
        {Icon && <Icon aria-hidden className="h-4 w-4" />}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </>
  );

  if (onToggle) {
    return (
      <button type="button" aria-pressed={active} onClick={onToggle} className={classes}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}
