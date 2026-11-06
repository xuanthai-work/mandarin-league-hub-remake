import { SearchInput } from "@/components/admin/kit/SearchInput";
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
      <SearchInput
        value={filters.q}
        onChange={(q) => patch({ q })}
        placeholder="Tìm tiêu đề, mô tả, người thực hiện…"
        label="Tìm kiếm nhiệm vụ"
      />

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
