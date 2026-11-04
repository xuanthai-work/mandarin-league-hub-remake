import { useMemo, useState } from "react";
import { Crown, Medal, Search, Trophy, UserRound, X } from "lucide-react";

import { TierBadge } from "@/components/TierBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isLeader } from "@/lib/points";
import { deptName } from "@/lib/recruitment";
import { cn } from "@/lib/utils";
import { initials, tierStep, type PointMember } from "./shared";

interface LeaderboardPanelProps {
  members: PointMember[];
  roleMap?: Record<string, string[]> | undefined;
  advisorIds?: Set<string> | undefined;
  loading: boolean;
}

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
        "relative flex h-full min-w-[210px] flex-1 snap-start flex-col items-center rounded-2xl border p-4 text-center sm:min-w-0",
        style.card,
      )}
    >
      {rank === 1 && (
        <span
          aria-hidden
          className="absolute -top-3 left-1/2 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full bg-gold text-[color:var(--primary-deep)] shadow-md"
        >
          <Crown className="h-4 w-4" strokeWidth={2.2} />
        </span>
      )}
      <span
        className={cn(
          "mt-1 inline-flex h-6 min-w-6 items-center justify-center gap-0.5 rounded-full px-1.5 font-mono text-[11px] font-bold",
          style.rank,
        )}
      >
        <Icon aria-hidden className="mr-0.5 h-3 w-3" />
        {rank}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-2 grid h-14 w-14 place-items-center rounded-full border-2 text-sm font-bold",
          style.avatar,
          rank === 1 && "ring-4 ring-gold/15",
        )}
      >
        {initials(member.full_name)}
      </span>
      <p className="mt-2 line-clamp-2 text-sm font-bold leading-tight text-foreground">
        {member.full_name}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{member.member_code}</p>
      <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
        {deptName(member.department)}
      </p>
      <div className="mt-1">
        <TierBadge tierKey={step.current.key} size={rank === 1 ? 52 : 44} />
      </div>
      <p className="mt-1 font-mono text-xl font-bold leading-none tabular-nums text-primary">
        {member.contribution_points.toLocaleString("vi-VN")}
        <span className="ml-1 text-[10px] font-medium text-muted-foreground">điểm</span>
      </p>
      <span
        className={cn(
          "mt-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
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
export function LeaderboardPanel({ members, roleMap, advisorIds, loading }: LeaderboardPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [visible, setVisible] = useState(8);

  const depts = useMemo(
    () => [...new Set(members.map((m) => m.department).filter(Boolean))].sort(),
    [members],
  );

  const board = useMemo(() => {
    const term = q.trim().toLowerCase();
    return members
      .filter((m) => showAll || !isLeader(m, roleMap?.[m.id], advisorIds?.has(m.id)))
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
  }, [members, showAll, roleMap, advisorIds, dept, q]);

  const resetVisible = () => setVisible(8);
  const top = board.slice(0, 3);
  const rest = board.slice(3);
  const shownRest = rest.slice(0, visible);
  const hasFilter = !!(q || dept);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <header className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="mr-auto flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <Trophy aria-hidden className="h-4 w-4 text-gold" />
          Bảng vinh danh
        </h2>
        <div
          role="group"
          aria-label="Phạm vi bảng vinh danh"
          className="flex rounded-lg border border-input p-0.5 text-[11px]"
        >
          <button
            type="button"
            onClick={() => {
              setShowAll(false);
              resetVisible();
            }}
            aria-pressed={!showAll}
            className={cn(
              "rounded-md px-2 py-1 font-medium transition-colors",
              !showAll
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Chỉ thành viên
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAll(true);
              resetVisible();
            }}
            aria-pressed={showAll}
            className={cn(
              "rounded-md px-2 py-1 font-medium transition-colors",
              showAll
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Tất cả
          </button>
        </div>
      </header>

      {!showAll && (
        <p className="border-b border-border/40 px-4 py-1.5 text-[10px] text-muted-foreground">
          Không tính Ban Điều hành, Trưởng/Phó Ban, Quản trị viên và Cố vấn (điểm cá nhân vẫn được
          giữ).
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-2.5">
        <div className="relative min-w-[190px] flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              resetVisible();
            }}
            placeholder="Tìm tên hoặc mã thành viên…"
            aria-label="Tìm thành viên trên bảng vinh danh"
            className="w-full rounded-xl border border-input bg-background py-1.5 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                resetVisible();
              }}
              aria-label="Xóa tìm kiếm"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select
          value={dept || "all"}
          onValueChange={(value) => {
            setDept(value === "all" ? "" : value);
            resetVisible();
          }}
        >
          <SelectTrigger
            aria-label="Lọc bảng vinh danh theo Ban"
            className="h-9 w-[160px] rounded-xl border-input bg-card text-[11px] font-normal shadow-none"
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
            <div
              className={cn(
                "flex snap-x gap-3 overflow-x-auto pb-1 sm:grid sm:overflow-visible sm:pb-0",
                top.length === 1
                  ? "sm:mx-auto sm:max-w-[260px] sm:grid-cols-1"
                  : top.length === 2
                    ? "sm:mx-auto sm:max-w-[520px] sm:grid-cols-2"
                    : "sm:grid-cols-3",
              )}
            >
              {top.map((member, index) => {
                const rank = index + 1;
                return (
                  <div key={member.id} className="flex h-full snap-start sm:block">
                    <PodiumCard member={member} rank={rank} />
                  </div>
                );
              })}
            </div>
            <p className="mt-3 hidden items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground sm:flex">
              <Medal aria-hidden className="h-3 w-3 text-gold" />
              Thanh tiến độ hiển thị chặng đường đến danh hiệu kế tiếp
            </p>
          </div>

          <div className="min-w-0">
            <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
              {shownRest.map((member, index) => (
                <MemberRow key={member.id} member={member} rank={index + 4} />
              ))}
              {shownRest.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {top.length > 0
                    ? "Đã hiển thị toàn bộ thành viên trong nhóm này."
                    : "Chưa có thành viên."}
                </li>
              )}
            </ul>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-[10px] text-muted-foreground">
                Hiển thị{" "}
                <b className="text-foreground">{Math.min(3 + shownRest.length, board.length)}</b> /{" "}
                {board.length} thành viên
              </span>
              {rest.length > visible && (
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + 10)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  Xem thêm {Math.min(10, rest.length - visible)} thành viên
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
