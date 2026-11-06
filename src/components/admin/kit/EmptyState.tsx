import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Nút hành động, ví dụ <Button size="admin">Thêm đối tác</Button> hoặc nút "Thử lại". */
  action?: ReactNode;
  /** "error" dùng cho lỗi tải dữ liệu: viền liền, tiêu đề màu đỏ. */
  tone?: "default" | "error";
  className?: string;
};

/** Khối trống chuẩn của admin: chưa có dữ liệu, không khớp bộ lọc, hoặc lỗi tải. */
export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  tone = "default",
  className = "",
}: EmptyStateProps) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`rounded-2xl border bg-card p-10 text-center ${
        tone === "error" ? "border-destructive/30" : "border-dashed border-border"
      } ${className}`}
    >
      {Icon && <Icon aria-hidden className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />}
      <p
        className={`text-sm font-medium ${
          tone === "error" ? "text-destructive" : "text-foreground"
        }`}
      >
        {title}
      </p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
    </div>
  );
}
