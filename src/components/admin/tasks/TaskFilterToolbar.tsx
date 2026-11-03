import { LayoutGrid, List, Search, X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deptName } from "@/lib/recruitment";
import { PRIORITY } from "@/lib/points";
import { cn } from "@/lib/utils";
import { type TaskFilters } from "./shared";

export type TaskView = "board" | "list";

interface TaskFilterToolbarProps {
  filters: TaskFilters;
  /** Counts per status (plus `all`), scoped to the other active filters. */
  counts: Record<string, number>;
  depts: string[];
  givers: string[];
  shown: number;
  total: number;
  view: TaskView;
  onViewChange: (view: TaskView) => void;
  onChange: (next: TaskFilters) => void;
  onReset: () => void;
}

const PILLS: { value: string; label: string; badge?: boolean }[] = [
  { value: "all", label: "Tất cả" },
  { value: "submitted", label: "Cần duyệt", badge: true },
  { value: "in_progress", label: "Đang làm" },
  { value: "revision", label: "Cần làm lại" },
  { value: "done", label: "Hoàn thành" },
];

const VIEWS: { value: TaskView; label: string; icon: typeof LayoutGrid }[] = [
  { value: "board", label: "Bảng Kanban", icon: LayoutGrid },
  { value: "list", label: "Danh sách", icon: List },
];

const trigger =
  "h-9 w-full rounded-xl border-input bg-card text-xs font-medium shadow-xs sm:w-[180px]";

export function TaskFilterToolbar({
  filters,
  counts,
  depts,
  givers,
  shown,
  total,
  view,
  onViewChange,
  onChange,
  onReset,
}: TaskFilterToolbarProps) {
  const patch = (part: Partial<TaskFilters>) => onChange({ ...filters, ...part });
  const hasActive =
    filters.status !== "all" || !!(filters.q || filters.dept || filters.priority || filters.giver);

  return (
    <div className="space-y-2.5 rounded-2xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Chế độ xem nhiệm vụ"
          className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-secondary/40 p-0.5"
        >
          {VIEWS.map((option) => {
            const Icon = option.icon;
            const active = view === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onViewChange(option.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="h-3.5 w-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>

        <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
          Hiển thị <b className="font-semibold text-foreground">{shown}</b> / {total} nhiệm vụ
        </span>
      </div>

      {view === "list" && (
        <div className="flex flex-wrap items-center gap-1.5">
          {PILLS.map((pill) => {
            const active = filters.status === pill.value;
            const count = counts[pill.value] ?? 0;
            return (
              <button
                key={pill.value}
                type="button"
                onClick={() => patch({ status: pill.value })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {pill.label}
                {pill.badge && count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={filters.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="Tìm tiêu đề, mô tả, người thực hiện…"
            aria-label="Tìm kiếm nhiệm vụ"
            className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-8 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {filters.q && (
            <button
              type="button"
              onClick={() => patch({ q: "" })}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={filters.dept || "all"}
          onValueChange={(v) => patch({ dept: v === "all" ? "" : v })}
        >
          <SelectTrigger aria-label="Lọc theo ban" className={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Mọi Ban
            </SelectItem>
            {depts.map((d) => (
              <SelectItem key={d} value={d} className="text-xs">
                {deptName(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority || "all"}
          onValueChange={(v) => patch({ priority: v === "all" ? "" : v })}
        >
          <SelectTrigger aria-label="Lọc theo ưu tiên" className={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Mọi ưu tiên
            </SelectItem>
            {(["high", "medium", "low"] as const).map((p) => (
              <SelectItem key={p} value={p} className="text-xs">
                {PRIORITY[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.giver || "all"}
          onValueChange={(v) => patch({ giver: v === "all" ? "" : v })}
        >
          <SelectTrigger aria-label="Lọc theo người giao" className={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Mọi người giao
            </SelectItem>
            {givers.map((g) => (
              <SelectItem key={g} value={g} className="text-xs">
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActive && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/50 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Đặt lại
          </button>
        )}
      </div>
    </div>
  );
}
