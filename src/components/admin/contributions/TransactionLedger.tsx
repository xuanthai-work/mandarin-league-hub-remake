import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ReceiptText, Search, X } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POINT_KIND } from "@/lib/points";
import { deptName } from "@/lib/recruitment";
import { cn } from "@/lib/utils";
import {
  EMPTY_LEDGER_FILTERS,
  KIND_META,
  csvCell,
  fmtStamp,
  isoDay,
  kindLabel,
  monthStart,
  shiftMonth,
  signed,
  type LedgerFilters,
  type PointMember,
  type PointTxn,
} from "./shared";

interface TransactionLedgerProps {
  rows: PointTxn[];
  members: PointMember[];
  loading: boolean;
  capped: boolean;
}

const PAGE_SIZE = 15;
const trigger =
  "h-9 w-full rounded-xl border-input bg-card text-[11px] font-medium shadow-xs sm:w-[155px]";

function KindBadge({ kind }: { kind: string }) {
  const meta = KIND_META[kind] ?? {
    chip: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        meta.chip,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {kindLabel(kind)}
    </span>
  );
}

function Delta({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "inline-block rounded-md px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums",
        value >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      {signed(value)}
    </span>
  );
}

/**
 * Accounting-style ledger: every points change is searchable by reason, member,
 * department, kind and approver, and always shows the balance after the change.
 */
export function TransactionLedger({ rows, members, loading, capped }: TransactionLedgerProps) {
  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_LEDGER_FILTERS);
  const [page, setPage] = useState(1);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const depts = useMemo(
    () => [...new Set(members.map((m) => m.department).filter(Boolean))].sort(),
    [members],
  );
  const actors = useMemo(
    () =>
      [...new Set(rows.map((t) => t.actor_name).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [rows],
  );

  const now = new Date();
  const thisStart = monthStart(now).getTime();
  const lastStart = shiftMonth(monthStart(now), -1).getTime();

  const filtered = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    return rows.filter((txn) => {
      const member = memberById.get(txn.member_id);
      const time = new Date(txn.created_at).getTime();
      const inPeriod =
        filters.period === "all" ||
        (filters.period === "this" && time >= thisStart) ||
        (filters.period === "last" && time >= lastStart && time < thisStart);
      const matchesTerm =
        !term ||
        txn.reason.toLowerCase().includes(term) ||
        txn.actor_name.toLowerCase().includes(term) ||
        (member?.full_name.toLowerCase().includes(term) ?? false) ||
        (member?.member_code.toLowerCase().includes(term) ?? false);
      return (
        inPeriod &&
        matchesTerm &&
        (!filters.dept || member?.department === filters.dept) &&
        (!filters.kind || txn.kind === filters.kind) &&
        (!filters.actor || txn.actor_name === filters.actor)
      );
    });
  }, [rows, filters, memberById, thisStart, lastStart]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const hasFilter = !!(
    filters.q ||
    filters.dept ||
    filters.kind ||
    filters.actor ||
    filters.period !== "all"
  );

  const patch = (next: Partial<LedgerFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };
  const reset = () => {
    setFilters(EMPTY_LEDGER_FILTERS);
    setPage(1);
  };

  const exportCsv = () => {
    const header = [
      "Thời gian",
      "Mã thành viên",
      "Thành viên",
      "Ban",
      "Loại",
      "Nội dung",
      "Biến động",
      "Số dư",
      "Người thực hiện",
    ];
    const lines = filtered.map((txn) => {
      const member = memberById.get(txn.member_id);
      return [
        fmtStamp(txn.created_at),
        member?.member_code ?? "",
        member?.full_name ?? "",
        member ? deptName(member.department) : "",
        kindLabel(txn.kind),
        txn.reason,
        signed(txn.delta),
        txn.balance_after,
        txn.actor_name || "Hệ thống",
      ]
        .map(csvCell)
        .join(",");
    });
    const blob = new Blob([`\uFEFF${[header.join(","), ...lines].join("\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lich-su-diem-${isoDay(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <header className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="mr-auto flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <ReceiptText aria-hidden className="h-4 w-4 text-primary" />
          Sổ cái lịch sử điểm
          <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
            {filtered.length}
          </span>
        </h2>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Download aria-hidden className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Xuất CSV</span>
        </button>
      </header>

      <div className="border-b border-border/50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[210px] flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={filters.q}
              onChange={(e) => patch({ q: e.target.value })}
              placeholder="Tìm lý do, thành viên, mã hoặc người ghi nhận…"
              aria-label="Tìm kiếm giao dịch điểm"
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
            onValueChange={(value) => patch({ dept: value === "all" ? "" : value })}
          >
            <SelectTrigger aria-label="Lọc theo Ban" className={trigger}>
              <SelectValue>{filters.dept ? deptName(filters.dept) : "Mọi Ban"}</SelectValue>
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
            value={filters.kind || "all"}
            onValueChange={(value) => patch({ kind: value === "all" ? "" : value })}
          >
            <SelectTrigger aria-label="Lọc theo loại điểm" className={trigger}>
              <SelectValue>{filters.kind ? kindLabel(filters.kind) : "Mọi loại điểm"}</SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">
                Mọi loại điểm
              </SelectItem>
              {Object.entries(POINT_KIND).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.actor || "all"}
            onValueChange={(value) => patch({ actor: value === "all" ? "" : value })}
          >
            <SelectTrigger aria-label="Lọc theo người ghi nhận" className={trigger}>
              <SelectValue>{filters.actor || "Mọi người ghi nhận"}</SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">
                Mọi người ghi nhận
              </SelectItem>
              {actors.map((actor) => (
                <SelectItem key={actor} value={actor} className="text-xs">
                  {actor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.period}
            onValueChange={(value) => patch({ period: value as LedgerFilters["period"] })}
          >
            <SelectTrigger aria-label="Lọc theo mốc thời gian" className={trigger}>
              <SelectValue>
                {filters.period === "this"
                  ? "Tháng này"
                  : filters.period === "last"
                    ? "Tháng trước"
                    : "Toàn bộ thời gian"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">
                Toàn bộ thời gian
              </SelectItem>
              <SelectItem value="this" className="text-xs">
                Tháng này
              </SelectItem>
              <SelectItem value="last" className="text-xs">
                Tháng trước
              </SelectItem>
            </SelectContent>
          </Select>

          {hasFilter && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-6 py-14 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
            <ReceiptText aria-hidden className="h-5 w-5" />
          </span>
          <p className="mt-1 text-sm font-medium text-foreground">
            {hasFilter ? "Không có giao dịch phù hợp" : "Chưa có giao dịch điểm"}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasFilter
              ? "Thử đổi từ khóa hoặc mốc thời gian."
              : "Mọi thay đổi điểm sẽ xuất hiện tại đây."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-secondary/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  {[
                    "Thời gian",
                    "Thành viên",
                    "Loại",
                    "Nội dung / Căn cứ",
                    "Biến động",
                    "Số dư",
                    "Người ghi nhận",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-2.5 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((txn) => {
                  const member = memberById.get(txn.member_id);
                  return (
                    <tr
                      key={txn.id}
                      className="border-t border-border/60 transition-colors hover:bg-accent/30"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {fmtStamp(txn.created_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-foreground">
                          {member?.full_name ?? "Không xác định"}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {member?.member_code ?? "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <KindBadge kind={txn.kind} />
                      </td>
                      <td className="max-w-[320px] px-3 py-2.5">
                        <p className="line-clamp-2 text-xs leading-relaxed text-foreground">
                          {txn.reason}
                        </p>
                        {txn.task_id && (
                          <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                            Nhiệm vụ #{txn.task_id.slice(0, 8)}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Delta value={txn.delta} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold tabular-nums text-foreground">
                        {txn.balance_after.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                        {txn.actor_name || "Hệ thống"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border/60 md:hidden">
            {visible.map((txn) => {
              const member = memberById.get(txn.member_id);
              return (
                <li key={txn.id} className="space-y-1.5 px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {member?.full_name ?? "Không xác định"}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {member?.member_code ?? "—"} · {fmtStamp(txn.created_at)}
                      </p>
                    </div>
                    <Delta value={txn.delta} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <KindBadge kind={txn.kind} />
                    {txn.task_id && (
                      <span className="font-mono text-[9px] text-muted-foreground">
                        Nhiệm vụ #{txn.task_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-foreground">{txn.reason}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span>
                      Số dư sau:{" "}
                      <b className="font-mono text-foreground">
                        {txn.balance_after.toLocaleString("vi-VN")}
                      </b>
                    </span>
                    <span className="truncate">Người ghi nhận: {txn.actor_name || "Hệ thống"}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 py-2.5">
            <p className="text-[10px] text-muted-foreground">
              Hiển thị <b className="text-foreground">{(current - 1) * PAGE_SIZE + 1}</b>–
              <b className="text-foreground">{Math.min(current * PAGE_SIZE, filtered.length)}</b> /{" "}
              {filtered.length} giao dịch
              {capped && (
                <span className="ml-1.5 rounded bg-warning-soft px-1.5 py-0.5 text-warning-foreground">
                  500 gần nhất
                </span>
              )}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={current <= 1}
                aria-label="Trang trước"
                className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft aria-hidden className="h-4 w-4" />
              </button>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {current}/{pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={current >= pageCount}
                aria-label="Trang sau"
                className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                <ChevronRight aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
