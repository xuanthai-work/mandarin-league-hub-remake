import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Medal,
  Search,
  Trophy,
  UserRound,
  X,
} from "lucide-react";

import { TierBadge } from "@/components/TierBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deptName } from "@/lib/recruitment";
import { cn } from "@/lib/utils";
import { initials, tierStep, type PointMember } from "./shared";

interface LeaderboardPanelProps {
  members: PointMember[];
  loading: boolean;
}

/** Rows per page below the podium; five rows keep the column level with the Top 3 cards. */
const REST_PAGE_SIZE = 5;

const RANK_STYLE: Record<
  number,
  { card: string; avatar: string; rank: string; icon: typeof Trophy }
> = {
  1: {
    card: "border-gold/70 bg-gradient-to-b from-gold/10 via-card to-card shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--gold)_75%,transparent)]",
    avatar: "border-gold bg-gold/15 text-[color:var(--metal-gold-lo)] dark:text-gold",
    rank: "bg-gold text-[color:var(--primary-deep)]",
    icon: Crown,
  },
  2: {
    card: "border-slate-300/80 bg-card dark:border-slate-500/40",
    avatar:
      "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-500/50 dark:bg-slate-500/15 dark:text-slate-300",
    rank: "bg-slate-200 text-slate-700 dark:bg-slate-500/30 dark:text-slate-200",
    icon: Medal,
  },
  3: {
    card: "border-amber-700/35 bg-card",
    avatar: "border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rank: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
    icon: Medal,
  },
};

function PodiumCard({ member, rank }: { member: PointMember; rank: number }) {
  const style = RANK_STYLE[rank] ?? RANK_STYLE[3]!;
  const Icon = style.icon;
  const step = tierStep(member.contribution_points);
  return (
    <article
      className={cn(
        "relative flex h-full w-full flex-col items-center rounded-xl border p-2 text-center sm:rounded-2xl sm:p-4",
        style.card,
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full px-1 font-mono text-[9px] font-bold sm:mt-1 sm:h-6 sm:min-w-6 sm:px-1.5 sm:text-[11px]",
          style.rank,
        )}
      >
        <Icon aria-hidden className="mr-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3" />
        {rank}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-1.5 grid h-9 w-9 place-items-center rounded-full border text-xs font-bold sm:mt-2 sm:h-14 sm:w-14 sm:border-2 sm:text-sm",
          style.avatar,
          rank === 1 && "ring-2 ring-gold/15 sm:ring-4",
        )}
      >
        {initials(member.full_name)}
      </span>
      <p className="mt-1 line-clamp-1 text-xs font-bold leading-tight text-foreground sm:mt-2 sm:line-clamp-2 sm:text-sm">
        {member.full_name}
      </p>
      <p className="mt-0.5 hidden font-mono text-[10px] text-muted-foreground sm:block">
        {member.member_code}
      </p>
      <p className="mt-0.5 line-clamp-1 text-[9px] text-muted-foreground sm:text-[10px]">
        {deptName(member.department)}
      </p>
      <div className="mt-1 origin-center scale-75 sm:scale-100">
        <TierBadge tierKey={step.current.key} size={rank === 1 ? 44 : 36} />
      </div>
      <p className="mt-0.5 font-mono text-sm font-bold leading-none tabular-nums text-primary sm:mt-1 sm:text-xl">
        {member.contribution_points.toLocaleString("vi-VN")}
        <span className="ml-0.5 text-[9px] font-medium text-muted-foreground sm:ml-1 sm:text-[10px]">
          đ
        </span>
      </p>
      <span
        className={cn(
          "mt-1 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold sm:mt-1.5 sm:px-2 sm:text-[10px]",
          step.current.className,
        )}
      >
        {step.current.label}
      </span>
    </article>
  );
}

function MemberRow({ member, rank }: { member: PointMember; rank: number }) {
  const step = tierStep(member.contribution_points);
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/35">
      <span
        className={cn(
          "w-6 shrink-0 text-center font-mono text-xs font-bold tabular-nums",
          rank <= 3 ? "text-[color:var(--metal-gold-lo)] dark:text-gold" : "text-muted-foreground",
        )}
      >
        {rank}
      </span>
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary"
      >
        {initials(member.full_name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{member.full_name}</p>
          <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground sm:inline">
            {member.member_code}
          </span>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">
          {deptName(member.department)}
          {member.position ? ` · ${member.position}` : ""}
        </p>
        <div
          className="mt-1 flex items-center gap-2"
          title={
            step.next
              ? `Còn ${step.remaining} điểm để lên ${step.next.label}`
              : "Đã đạt cấp cao nhất"
          }
        >
          <span
            className={cn(
              "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
              step.current.className,
            )}
          >
            {step.current.label}
          </span>
          <span className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-gold transition-all duration-500"
              style={{ width: `${step.pct}%` }}
            />
          </span>
          <span className="hidden shrink-0 text-[9px] tabular-nums text-muted-foreground sm:inline">
            {step.next ? `còn ${step.remaining}` : "tối đa"}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-sm font-bold tabular-nums text-foreground">
          {member.contribution_points.toLocaleString("vi-VN")}
        </p>
        <p className="text-[9px] text-muted-foreground">điểm</p>
      </div>
    </li>
  );
}

/**
 * Leaderboard 2.0: a Top-3 podium for identity and a searchable ranking list
 * with live tier-progress so every member can see their next milestone.
 */
export function LeaderboardPanel({ members, loading }: LeaderboardPanelProps) {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [page, setPage] = useState(1);

  const depts = useMemo(
    () => [...new Set(members.map((m) => m.department).filter(Boolean))].sort(),
    [members],
  );

  const board = useMemo(() => {
    const term = q.trim().toLowerCase();
    return members
      .filter((m) => !dept || m.department === dept)
      .filter(
        (m) =>
          !term ||
          m.full_name.toLowerCase().includes(term) ||
          m.member_code.toLowerCase().includes(term),
      )
      .sort(
        (a, b) =>
          b.contribution_points - a.contribution_points || a.full_name.localeCompare(b.full_name),
      );
  }, [members, dept, q]);

  const resetPage = () => setPage(1);
  const top = board.slice(0, 3);
  const rest = board.slice(3);
  const pageCount = Math.max(1, Math.ceil(rest.length / REST_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pagedRest = rest.slice((current - 1) * REST_PAGE_SIZE, current * REST_PAGE_SIZE);
  const hasFilter = !!(q || dept);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <header className="flex flex-wrap items-center gap-2 px-4 py-3">
        <h2 className="mr-auto flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <Trophy aria-hidden className="h-4 w-4 text-gold" />
          Bảng vinh danh
        </h2>
      </header>

      <div className="flex flex-wrap items-center gap-2.5 px-3 py-2.5 sm:px-4">
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              resetPage();
            }}
            placeholder="Tìm tên hoặc mã thành viên…"
            aria-label="Tìm thành viên trên bảng vinh danh"
            className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                resetPage();
              }}
              aria-label="Xóa tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select
          value={dept || "all"}
          onValueChange={(value) => {
            setDept(value === "all" ? "" : value);
            resetPage();
          }}
        >
          <SelectTrigger
            aria-label="Lọc bảng vinh danh theo Ban"
            className="h-9 w-full rounded-xl border-input bg-card text-xs font-normal shadow-xs sm:w-[180px]"
          >
            <SelectValue>{dept ? deptName(dept) : "Mọi Ban"}</SelectValue>
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
      </div>

      {loading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : board.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-6 py-14 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
            <UserRound aria-hidden className="h-5 w-5" />
          </span>
          <p className="mt-1 text-sm font-medium text-foreground">
            {hasFilter ? "Không tìm thấy thành viên phù hợp" : "Chưa có thành viên để xếp hạng"}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasFilter
              ? "Thử xóa bộ lọc hoặc đổi từ khóa tìm kiếm."
              : "Bảng xếp hạng sẽ có dữ liệu khi thành viên nhận điểm."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
          <div>
            <div className="pt-2 sm:pt-3">
              <div
                className={cn(
                  "grid gap-2 sm:gap-3",
                  top.length === 1
                    ? "mx-auto max-w-[220px] grid-cols-1"
                    : top.length === 2
                      ? "mx-auto max-w-[340px] grid-cols-2"
                      : "grid-cols-3",
                )}
              >
                {top.map((member, index) => {
                  const rank = index + 1;
                  return (
                    <div key={member.id} className="h-full">
                      <PodiumCard member={member} rank={rank} />
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-2.5 hidden items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground sm:flex">
              <Medal aria-hidden className="h-3 w-3 text-gold" />
              Thanh tiến độ hiển thị chặng đường đến danh hiệu kế tiếp
            </p>
          </div>

          <div className="min-w-0">
            <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
              {pagedRest.map((member, index) => {
                const rank = (current - 1) * REST_PAGE_SIZE + index + 4;
                return <MemberRow key={member.id} member={member} rank={rank} />;
              })}
              {pagedRest.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {top.length > 0 ? "Không có thêm thành viên nào." : "Chưa có thành viên."}
                </li>
              )}
            </ul>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
              <span className="text-[10px] text-muted-foreground">
                {rest.length > 0 ? (
                  <>
                    Hiển thị{" "}
                    <b className="text-foreground">
                      {(current - 1) * REST_PAGE_SIZE + 4} -{" "}
                      {Math.min(current * REST_PAGE_SIZE + 3, board.length)}
                    </b>{" "}
                    / {board.length} thành viên
                  </>
                ) : (
                  <>
                    Hiển thị <b className="text-foreground">{board.length}</b> / {board.length}{" "}
                    thành viên
                  </>
                )}
              </span>

              {pageCount > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={current <= 1}
                    aria-label="Trang trước"
                    className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {current} / {pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={current >= pageCount}
                    aria-label="Trang sau"
                    className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
