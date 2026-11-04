import { Search, X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP_STATUS, RECRUIT_DEPTS } from "@/lib/recruitment";
import { cn } from "@/lib/utils";
import {
  POSITION_FILTERS,
  STATUS_DOT,
  type CandidateFilters,
  type CandidatePeriod,
} from "./shared";

interface CandidateFilterToolbarProps {
  filters: CandidateFilters;
  periods: CandidatePeriod[];
  shown: number;
  total: number;
  onChange: (next: CandidateFilters) => void;
  onReset: () => void;
}

const trigger =
  "h-9 w-full rounded-xl border-input bg-card text-xs font-normal shadow-xs sm:w-[185px]";

export function CandidateFilterToolbar({
  filters,
  periods,
  shown,
  total,
  onChange,
  onReset,
}: CandidateFilterToolbarProps) {
  const hasActive = Object.values(filters).some(Boolean);
  const patch = (part: Partial<CandidateFilters>) => onChange({ ...filters, ...part });

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
            placeholder="Tìm họ tên, email, điện thoại, mã hồ sơ…"
            aria-label="Tìm kiếm ứng viên"
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
          value={filters.period || "all"}
          onValueChange={(v) => patch({ period: v === "all" ? "" : v })}
        >
          <SelectTrigger aria-label="Lọc theo đợt tuyển" className={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Mọi đợt tuyển
            </SelectItem>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            {RECRUIT_DEPTS.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-xs">
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.position || "all"}
          onValueChange={(v) => patch({ position: v === "all" ? "" : v })}
        >
          <SelectTrigger aria-label="Lọc theo vị trí" className={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Mọi vị trí
            </SelectItem>
            {POSITION_FILTERS.map((p) => (
              <SelectItem key={p} value={p} className="text-xs">
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || "all"}
          onValueChange={(v) => patch({ status: v === "all" ? "" : v })}
        >
          <SelectTrigger aria-label="Lọc theo trạng thái" className={trigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Mọi trạng thái
            </SelectItem>
            {Object.entries(APP_STATUS).map(([key, label]) => (
              <SelectItem key={key} value={key} className="text-xs">
                <span className="flex w-full items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      STATUS_DOT[key] ?? "bg-muted-foreground/50",
                    )}
                  />
                  <span>{label}</span>
                </span>
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
            Xóa bộ lọc
          </button>
        )}

        <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
          Hiển thị <b className="font-semibold text-foreground">{shown}</b> / {total} hồ sơ
        </span>
      </div>
    </div>
  );
}
