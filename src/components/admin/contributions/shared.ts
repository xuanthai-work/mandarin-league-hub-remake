import { POINT_KIND, TIERS, tierOf, type Tier } from "@/lib/points";

/** Minimal member shape used by the points screens. */
export type PointMember = {
  id: string;
  full_name: string;
  member_code: string;
  department: string;
  position: string | null;
  contribution_points: number;
  status: string;
};

/** One immutable row of `public.point_transactions`. */
export type PointTxn = {
  id: string;
  member_id: string;
  delta: number;
  reason: string;
  kind: string;
  task_id: string | null;
  balance_after: number;
  actor_name: string;
  created_at: string;
  /** Storage paths of the proof files attached to a manual adjustment. */
  evidence_paths?: string[] | null;
};

/** Narrow projection used by the KPI strip (current + previous month). */
export type PointStatRow = Pick<PointTxn, "member_id" | "delta" | "kind" | "reason" | "created_at">;

export type LedgerPeriod = "this" | "last" | "all";

export type LedgerFilters = {
  q: string;
  dept: string;
  kind: string;
  actor: string;
  period: LedgerPeriod;
};

export const EMPTY_LEDGER_FILTERS: LedgerFilters = {
  q: "",
  dept: "",
  kind: "",
  actor: "",
  period: "all",
};

/** Badge tones for the four transaction kinds (also used by the ledger dots). */
export const KIND_META: Record<string, { chip: string; dot: string; bar: string }> = {
  task: {
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  attendance: {
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },
  bonus: {
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
  },
  penalty: {
    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
};

export const kindLabel = (kind: string) => POINT_KIND[kind] ?? kind;

/** Two-letter monogram from the first and last word of a Vietnamese name. */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1] ?? "") : "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "TML";
}

const two = (n: number) => String(n).padStart(2, "0");

/** `DD/MM/YYYY · HH:mm` — the ledger timestamp format. */
export function fmtStamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} · ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** ISO `YYYY-MM-DD` in local time (Postgres `date` format). */
export function isoDay(date: Date) {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

export function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function shiftMonth(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Local `YYYY-MM-DD` key, used to count distinct attendance sessions. */
export function dayKey(iso: string) {
  return isoDay(new Date(iso));
}

export type TierStep = {
  current: Tier;
  next: Tier | null;
  pct: number;
  remaining: number;
};

/** Current tier plus the distance to the next one (highest tier is always 100%). */
export function tierStep(points: number): TierStep {
  const current = tierOf(points);
  const ascending = [...TIERS].reverse();
  const index = ascending.findIndex((t) => t.key === current.key);
  const next = index >= 0 ? (ascending[index + 1] ?? null) : null;
  if (!next) return { current, next: null, pct: 100, remaining: 0 };
  const span = next.min - current.min;
  const pct =
    span > 0 ? Math.min(100, Math.max(0, Math.round(((points - current.min) / span) * 100))) : 100;
  return { current, next, pct, remaining: Math.max(0, next.min - points) };
}

/** `+12` / `-8` — no sign for zero. */
export function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

/** Safe CSV cell (quotes doubled, wrapped when needed). */
export function csvCell(value: string | number) {
  const text = String(value);
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const POINT_LIMITS = {
  bonus: 100,
  penalty: 50,
  reasonMin: 3,
  reasonMax: 300,
  /** Stricter than the DB floor, required by the audit-focused adjustment modal. */
  adjustmentReasonMin: 10,
} as const;

/** `YYYY-MM-DD` → `DD/MM/YYYY` without timezone drift. */
export function dmyFromISO(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export type ChunkResult<T> = { item: T; error: string | null };

/**
 * `adjust_points` accepts one member per call and there is no batch RPC, so
 * writes go out in small parallel chunks. Progress advances after every chunk
 * and a failed member never stops the rest.
 */
export async function runInChunks<T>(
  items: T[],
  size: number,
  worker: (item: T) => Promise<{ error: { message: string } | null }>,
  onProgress: (done: number, total: number) => void,
): Promise<ChunkResult<T>[]> {
  const results: ChunkResult<T>[] = [];
  for (let index = 0; index < items.length; index += size) {
    const chunk = items.slice(index, index + size);
    const settled = await Promise.all(chunk.map((item) => worker(item)));
    settled.forEach((result, offset) => {
      const item = chunk[offset];
      if (item !== undefined) results.push({ item, error: result.error?.message ?? null });
    });
    onProgress(Math.min(index + size, items.length), items.length);
  }
  return results;
}
