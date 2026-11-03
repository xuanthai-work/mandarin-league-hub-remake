import { Search, X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deptName } from "@/lib/recruitment";
import { PRIORITY } from "@/lib/points";
import { type TaskFilters } from "./shared";

interface TaskFilterToolbarProps {
  filters: TaskFilters;
  depts: string[];
  givers: string[];
  shown: number;
  total: number;
  onChange: (next: TaskFilters) => void;
  onReset: () => void;
}

const trigger =
  "h-9 w-full rounded-xl border-input bg-card text-xs font-medium shadow-xs sm:w-[180px]";

export function TaskFilterToolbar({
  filters,
  depts,
  givers,
  shown,
  total,
  onChange,
  onReset,
}: TaskFilterToolbarProps) {
  const patch = (part: Partial<TaskFilters>) => onChange({ ...filters, ...part });
  const hasActive = !!(filters.q || filters.dept || filters.priority || filters.giver);

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
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

        <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
          Hiển thị <b className="font-semibold text-foreground">{shown}</b> / {total} nhiệm vụ
        </span>
      </div>
    </div>
  );
}
