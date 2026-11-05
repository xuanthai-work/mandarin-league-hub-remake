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
import { PRIORITY_DOT, type TaskFilters } from "./shared";

interface TaskFilterToolbarProps {
  filters: TaskFilters;
  depts: string[];
  givers: string[];
  onChange: (next: TaskFilters) => void;
}

const trigger =
  "h-9 w-full rounded-xl border-input bg-card text-xs font-normal shadow-xs sm:w-[180px]";

export function TaskFilterToolbar({ filters, depts, givers, onChange }: TaskFilterToolbarProps) {
  const patch = (part: Partial<TaskFilters>) => onChange({ ...filters, ...part });

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
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
          className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {filters.q && (
          <button
            type="button"
            onClick={() => patch({ q: "" })}
            aria-label="Xóa nội dung tìm kiếm"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[p]}`} />
                <span>{PRIORITY[p]}</span>
              </span>
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
    </div>
  );
}
