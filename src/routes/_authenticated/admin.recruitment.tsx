import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Play,
  Plus,
  Settings2,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DatePicker } from "@/components/ui/date-picker";
import { useConfirm } from "@/components/admin/Trash";
import { supabase } from "@/integrations/supabase/client";
import {
  PERIOD_STATUS,
  QUESTION_BANK,
  QUESTION_KINDS,
  RECRUIT_DEPTS,
  deptName,
  periodStatus,
  periodStatusLabel,
  positionsFor,
} from "@/lib/recruitment";

export const Route = createFileRoute("/_authenticated/admin/recruitment")({
  staticData: { sitemap: false },
  component: RecruitmentAdmin,
});

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const btn =
  "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent";
const DAY_MS = 86_400_000;

/** Shadcn select styled to match the inputs and float above the z-[60] drawer. */
const DRAWER_SELECT_TRIGGER =
  "mt-1 flex h-8 w-full items-center justify-between rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs shadow-xs transition-colors hover:border-input/80 focus:outline-none focus:ring-1 focus:ring-primary/30";
const DRAWER_SELECT_CONTENT =
  "z-[70] max-h-64 rounded-xl border-border bg-popover/95 backdrop-blur-md shadow-xl";
const DRAWER_SELECT_ITEM =
  "rounded-lg text-xs cursor-pointer py-1.5 focus:bg-accent focus:text-accent-foreground";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  open: "bg-success/15 text-success",
  paused: "bg-gold/15 text-gold",
  ended: "bg-secondary text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const STATUS_DOT: Record<string, string> = {
  draft: "bg-muted-foreground/50",
  open: "bg-success",
  paused: "bg-gold",
  ended: "bg-muted-foreground/50",
  cancelled: "bg-destructive",
};

/** Keeps a textarea exactly as tall as its content so it never grows an inner scrollbar. */
function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const style = getComputedStyle(el);
    const borders =
      (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
    el.style.height = "auto";
    // scrollHeight excludes borders, so add them back or the box overflows by 1px and shows a bar.
    el.style.height = `${el.scrollHeight + borders}px`;
  }, [ref, value]);
}

const todayISO = () => new Date().toISOString().slice(0, 10);
/** Dates come from Postgres as `YYYY-MM-DD`; parse as UTC so the label never drifts a day. */
const dateMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fmtDate = (d: string | null) =>
  d ? new Date(dateMs(d)).toLocaleDateString("vi-VN", { timeZone: "UTC" }) : "—";

/** Turns a Postgres error into a sentence an admin can act on. */
function friendlyError(e: { message: string; code?: string }) {
  if (e.code === "23505" && e.message.includes("recruitment_one_open"))
    return "Hiện đang có một đợt tuyển khác đang mở. Hãy đóng đợt đó trước khi mở đợt mới.";
  if (e.code === "23505") return "Dữ liệu bị trùng — vui lòng kiểm tra lại.";
  if (e.code === "23514") return "Ngày kết thúc phải sau ngày bắt đầu.";
  if (e.code === "23503")
    return "Không thể xóa vì đã có hồ sơ ứng viên thuộc đợt tuyển. Hãy đóng đợt thay vì xóa.";
  return e.message;
}

type Period = {
  id: string;
  name: string;
  description: string;
  starts_on: string;
  ends_on: string;
  status: string;
  created_at: string;
};
type Position = {
  id: string;
  period_id: string;
  department: string;
  position: string;
  enabled: boolean;
};
type Topic = {
  id: string;
  department: string | null;
  position: string | null;
  period_id: string | null;
  title: string;
  description: string;
  sort_order: number;
  visible: boolean;
  created_at: string;
};
type Question = {
  id: string;
  topic_id: string;
  prompt: string;
  kind: string;
  options: string[];
  required: boolean;
  sort_order: number;
  visible: boolean;
};

async function load() {
  const today = todayISO();
  // Auto-close expired open periods.
  await supabase
    .from("recruitment_periods")
    .update({ status: "ended" })
    .eq("status", "open")
    .lt("ends_on", today);
  const [p, pos, t, q, apps] = await Promise.all([
    supabase.from("recruitment_periods").select("*").order("created_at", { ascending: false }),
    supabase.from("recruitment_positions").select("*"),
    supabase.from("recruitment_topics").select("*").order("sort_order"),
    supabase.from("recruitment_questions").select("*").order("sort_order"),
    supabase.from("candidate_applications").select("period_id"),
  ]);
  const appCountByPeriod: Record<string, number> = {};
  for (const a of (apps.data ?? []) as { period_id: string }[])
    appCountByPeriod[a.period_id] = (appCountByPeriod[a.period_id] ?? 0) + 1;
  return {
    periods: (p.data ?? []) as Period[],
    positions: (pos.data ?? []) as Position[],
    topics: (t.data ?? []) as Topic[],
    questions: (q.data ?? []) as Question[],
    appCountByPeriod,
  };
}

type Data = Awaited<ReturnType<typeof load>>;
type Run = (
  p: PromiseLike<{ error: { message: string; code?: string } | null }>,
  ok?: string,
) => Promise<boolean>;
type Confirm = ReturnType<typeof useConfirm>["confirm"];

function RecruitmentAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-recruitment"], queryFn: load });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-recruitment"] });
    qc.invalidateQueries({ queryKey: ["open-recruitment"] });
  };
  const [tab, setTab] = useState<"periods" | "questions">("periods");
  const [creating, setCreating] = useState(false);
  const [drawerPeriodId, setDrawerPeriodId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const run: Run = async (p, ok) => {
    const { error } = await p;
    if (error) {
      toast.error(friendlyError(error));
      return false;
    }
    if (ok) toast.success(ok);
    refresh();
    return true;
  };

  const drawerPeriod = data?.periods.find((p) => p.id === drawerPeriodId) ?? null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <AdminPageHeader
        title="Đợt tuyển & Câu hỏi"
        actions={
          tab === "periods" ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Tạo đợt tuyển
            </button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-muted/60 p-1">
          {(["periods", "questions"] as const).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={active}
                className={`relative rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="recruitment-tab-pill"
                    className="absolute inset-0 rounded-lg bg-primary shadow-xs"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {t === "periods" ? "Đợt tuyển dụng" : "Ngân hàng câu hỏi"}
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-semibold leading-relaxed ${active ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {t === "periods" ? (data?.periods.length ?? 0) : (data?.questions.length ?? 0)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!data ? (
        <p className="p-10 text-center text-muted-foreground">Đang tải…</p>
      ) : tab === "periods" ? (
        <Periods
          data={data}
          run={run}
          confirm={confirm}
          onCreate={() => setCreating(true)}
          onConfigure={setDrawerPeriodId}
        />
      ) : (
        <Questions data={data} run={run} confirm={confirm} />
      )}

      {dialog}

      <AnimatePresence>
        {creating && <CreatePeriodDrawer refresh={refresh} onClose={() => setCreating(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {drawerPeriod && (
          <PeriodDrawer
            key={drawerPeriod.id}
            period={drawerPeriod}
            positions={data?.positions ?? []}
            run={run}
            onClose={() => setDrawerPeriodId(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

// ---------------------------------------------------------------- campaigns tab

function Periods({
  data,
  run,
  confirm,
  onCreate,
  onConfigure,
}: {
  data: Data;
  run: Run;
  confirm: Confirm;
  onCreate: () => void;
  onConfigure: (id: string) => void;
}) {
  const activePeriod = data.periods.find((p) => p.status === "open");
  const previous = data.periods.filter((p) => p.status !== "open");
  const enabledOf = (id: string) =>
    data.positions.filter((x) => x.period_id === id && x.enabled).length;
  /** Ended/cancelled campaigns are archived: they can be configured or deleted, but never reopened. */
  const canReopen = (p: Period) => !["ended", "cancelled"].includes(periodStatus(p.status));

  const openPeriod = (p: Period) => {
    if (!canReopen(p)) {
      toast.error("Đợt tuyển đã kết thúc hoặc đã hủy nên không thể mở lại.");
      return;
    }
    if (activePeriod) {
      toast.error(`Đợt "${activePeriod.name}" đang mở. Hãy đóng đợt đó trước khi mở đợt mới.`);
      return;
    }
    if (p.starts_on > todayISO()) {
      toast.error(
        `Đợt tuyển bắt đầu ${fmtDate(p.starts_on)} — chưa thể mở nhận đơn trước ngày bắt đầu.`,
      );
      return;
    }
    if (p.ends_on < todayISO()) {
      toast.error("Đợt tuyển đã hết hạn. Hãy lùi ngày kết thúc trước khi mở đợt.");
      return;
    }
    run(
      supabase.from("recruitment_periods").update({ status: "open" }).eq("id", p.id),
      "Đã mở đợt tuyển",
    );
  };

  const removePeriod = async (p: Period) => {
    const ok = await confirm({
      title: "Xóa đợt tuyển?",
      description: `"${p.name}" cùng toàn bộ cấu hình vị trí và chủ đề câu hỏi của đợt này sẽ bị xóa. Thao tác không thể hoàn tác.`,
      confirmLabel: "Xóa đợt tuyển",
      destructive: true,
    });
    if (!ok) return;
    run(supabase.from("recruitment_periods").delete().eq("id", p.id), "Đã xóa đợt tuyển");
  };

  if (data.periods.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="font-semibold text-primary-deep">Chưa có đợt tuyển nào</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tạo đợt tuyển đầu tiên để bắt đầu nhận hồ sơ ứng viên.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Tạo đợt tuyển
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      {activePeriod ? (
        <ActiveCampaignHero
          period={activePeriod}
          enabledPositions={enabledOf(activePeriod.id)}
          appCount={data.appCountByPeriod[activePeriod.id] ?? 0}
          run={run}
          confirm={confirm}
          onConfigure={() => onConfigure(activePeriod.id)}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6">
          <p className="font-semibold text-primary-deep">Không có đợt tuyển nào đang mở</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Biểu mẫu công khai chỉ nhận hồ sơ khi có một đợt ở trạng thái “Đang mở”. Hãy mở một đợt
            bên dưới để bắt đầu nhận đơn.
          </p>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Các đợt tuyển khác
          </h2>
          <span className="text-xs text-muted-foreground">{previous.length} đợt</span>
        </div>

        {previous.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Chưa có đợt tuyển nào khác.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary/70 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Đợt tuyển</th>
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 font-semibold">Vị trí</th>
                  <th className="px-4 py-3 font-semibold">Hồ sơ</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {previous.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border/70 transition-colors hover:bg-accent/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{p.name}</div>
                      {p.description && (
                        <div className="mt-0.5 line-clamp-1 max-w-[320px] text-xs text-muted-foreground">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {fmtDate(p.starts_on)} → {fmtDate(p.ends_on)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      <span className="font-mono font-semibold text-foreground">
                        {enabledOf(p.id)}
                      </span>
                      <span className="text-muted-foreground"> vị trí mở</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      <span className="font-mono font-semibold text-foreground">
                        {data.appCountByPeriod[p.id] ?? 0}
                      </span>
                      <span className="text-muted-foreground"> hồ sơ</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_TONE[periodStatus(p.status)] ?? "bg-secondary text-muted-foreground"}`}
                      >
                        {periodStatusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        {canReopen(p) && (
                          <>
                            <button
                              type="button"
                              onClick={() => openPeriod(p)}
                              className={`${btn} text-primary`}
                              title="Chuyển đợt sang trạng thái Đang mở"
                            >
                              <Play className="h-3.5 w-3.5" />
                              Mở đợt
                            </button>
                            <button
                              type="button"
                              onClick={() => onConfigure(p.id)}
                              className={btn}
                              title="Cấu hình thông tin, ban & vị trí tuyển"
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                              Cấu hình
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => removePeriod(p)}
                          aria-label={`Xóa đợt ${p.name}`}
                          title="Xóa đợt tuyển"
                          className="rounded-lg border border-border p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const metricBase =
  "flex flex-col items-stretch justify-start rounded-xl border border-border/70 bg-secondary/40 p-3 text-left transition-colors";

function ActiveCampaignHero({
  period,
  enabledPositions,
  appCount,
  run,
  confirm,
  onConfigure,
}: {
  period: Period;
  enabledPositions: number;
  appCount: number;
  run: Run;
  confirm: Confirm;
  onConfigure: () => void;
}) {
  const startMs = dateMs(period.starts_on);
  const endMs = dateMs(period.ends_on);
  const nowMs = dateMs(todayISO());
  const totalDays = Math.max(1, Math.round((endMs - startMs) / DAY_MS));
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((nowMs - startMs) / DAY_MS)));
  const percent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  const remainingDays = Math.max(0, Math.round((endMs - nowMs) / DAY_MS));
  const status = periodStatus(period.status);

  /** Departments that actually have at least one enabled position in this campaign. */
  /** Archiving is irreversible (ended/cancelled periods can never reopen), so ask first. */
  const changeStatus = async (next: string) => {
    if (next === status) return;
    if (next === "ended" || next === "cancelled") {
      const ok = await confirm({
        title: next === "ended" ? "Kết thúc đợt tuyển?" : "Hủy đợt tuyển?",
        description:
          next === "ended"
            ? `"${period.name}" sẽ đóng nhận hồ sơ và được lưu trữ. Đợt đã kết thúc không thể mở lại.`
            : `"${period.name}" sẽ bị hủy và lưu trữ. Đợt đã hủy không thể mở lại.`,
        confirmLabel: next === "ended" ? "Kết thúc đợt" : "Hủy đợt",
        destructive: next === "cancelled",
      });
      if (!ok) return;
    }
    run(
      supabase.from("recruitment_periods").update({ status: next }).eq("id", period.id),
      "Đã cập nhật trạng thái đợt tuyển.",
    );
  };

  return (
    <div className="@container relative overflow-hidden rounded-2xl border border-gold/30 bg-card shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />

      <div className="flex items-center justify-between gap-2 border-b border-border/60 py-1.5 pl-6 pr-4">
        <Select value={status} onValueChange={(v) => void changeStatus(v)}>
          <SelectTrigger
            aria-label="Đổi trạng thái đợt tuyển"
            className="-ml-1 h-8 w-auto gap-1.5 rounded-lg border-0 bg-transparent px-2 text-[13px] font-semibold text-foreground shadow-none hover:bg-accent focus:ring-0 data-[state=open]:bg-accent [@media(pointer:coarse)]:h-11"
          >
            <SelectValue>
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status] ?? "bg-muted-foreground/50"}`}
                />
                {periodStatusLabel(period.status)}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {Object.entries(PERIOD_STATUS)
              .filter(([k]) => k !== "draft")
              .map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[k] ?? "bg-muted-foreground/50"}`}
                    />
                    {v}
                  </span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={onConfigure}
          aria-label="Cấu hình đợt tuyển"
          title="Sửa thông tin, bật/tắt ban & vị trí tuyển"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 [@media(pointer:coarse)]:h-11"
        >
          <Settings2 className="h-4 w-4" />
          <span className="hidden @min-[560px]:inline">Cấu hình</span>
        </button>
      </div>

      <div className="space-y-6 px-6 pt-4 pb-6 @min-[880px]:px-7 @min-[880px]:pt-5 @min-[880px]:pb-6">
        {/* Tier 1 — identity, progress and actions */}
        <div className="flex flex-col gap-4 @min-[880px]:flex-row @min-[880px]:items-end @min-[880px]:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="text-2xl font-bold leading-tight tracking-tight text-primary-deep @min-[640px]:text-[26px] @min-[880px]:text-[30px]">
                {period.name}
              </h2>
              {period.description && (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{period.description}</p>
              )}
            </div>

            <div className="w-full space-y-1.5">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{fmtDate(period.starts_on)}</span> →{" "}
                <span className="font-medium text-foreground">{fmtDate(period.ends_on)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Đã trôi qua {percent}% thời gian nhận hồ sơ (còn {remainingDays} ngày)
              </p>
            </div>
          </div>
        </div>

        {/* Tier 2 — metric strip */}
        <div className="grid grid-cols-2 gap-3.5 border-t border-border/60 pt-5">
          <button
            type="button"
            onClick={onConfigure}
            title="Bấm để mở ma trận cấu hình vị trí"
            className={`${metricBase} transition-colors hover:border-primary/40 hover:bg-accent/50`}
          >
            <MetricContent
              icon={Users}
              label="Vị trí mở tuyển"
              value={`${enabledPositions}`}
              hint="vị trí"
            />
          </button>

          <Link
            to="/admin/candidates"
            title="Bấm để đi tới danh sách hồ sơ ứng viên"
            className={`${metricBase} transition-colors hover:border-primary/40 hover:bg-accent/50`}
          >
            <MetricContent
              icon={FileText}
              label="Hồ sơ đã nộp"
              value={`${appCount}`}
              hint="hồ sơ"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetricContent({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
        <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold leading-none text-primary-deep">{value}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- position drawer

function PeriodDrawer({
  period,
  positions,
  run,
  onClose,
}: {
  period: Period;
  positions: Position[];
  run: Run;
  onClose: () => void;
}) {
  /** Editable period info; saved explicitly with the footer button. */
  const [f, setF] = useState({
    name: period.name,
    description: period.description,
    starts_on: period.starts_on,
    ends_on: period.ends_on,
  });
  const [busy, setBusy] = useState(false);
  const [discardAsk, setDiscardAsk] = useState(false);
  /** Description auto-grows with its text instead of showing an inner scrollbar. */
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  /** Optimistic switch state keyed by `dept|position` so each toggle feels instant. */
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const rows = positions.filter((x) => x.period_id === period.id);

  const dirty =
    f.name.trim() !== period.name ||
    f.description.trim() !== period.description ||
    f.starts_on !== period.starts_on ||
    f.ends_on !== period.ends_on;

  const requestClose = () => {
    if (dirty) setDiscardAsk(true);
    else onClose();
  };

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    const style = getComputedStyle(el);
    const borders =
      (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
    el.style.height = "auto";
    // scrollHeight excludes borders, so add them back or the box overflows by 1px and shows a bar.
    el.style.height = `${el.scrollHeight + borders}px`;
  }, [f.description]);

  useAutoGrow(descriptionRef, f.description);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (discardAsk) setDiscardAsk(false);
      else if (dirty) setDiscardAsk(true);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, dirty, discardAsk]);

  const keyOf = (dept: string, position: string) => `${dept}|${position}`;
  const enabledOf = (dept: string, position: string) => {
    const pending = local[keyOf(dept, position)];
    if (pending !== undefined) return pending;
    return !!rows.find((x) => x.department === dept && x.position === position)?.enabled;
  };
  const enabledCount = RECRUIT_DEPTS.reduce(
    (n, d) => n + positionsFor(d.id).filter((p) => enabledOf(d.id, p)).length,
    0,
  );

  const saveInfo = async () => {
    if (!dirty || busy) return;
    if (f.name.trim().length < 3) return void toast.error("Tên đợt tuyển tối thiểu 3 ký tự.");
    if (!f.starts_on || !f.ends_on)
      return void toast.error("Vui lòng chọn ngày bắt đầu và ngày kết thúc.");
    if (f.ends_on <= f.starts_on) return void toast.error("Ngày kết thúc phải sau ngày bắt đầu.");
    setBusy(true);
    const ok = await run(
      supabase
        .from("recruitment_periods")
        .update({
          name: f.name.trim(),
          description: f.description.trim(),
          starts_on: f.starts_on,
          ends_on: f.ends_on,
        })
        .eq("id", period.id),
      "Đã cập nhật thông tin đợt tuyển",
    );
    setBusy(false);
    if (ok) setDiscardAsk(false);
  };

  const toggle = async (dept: string, position: string, next: boolean) => {
    const key = keyOf(dept, position);
    setLocal((s) => ({ ...s, [key]: next }));
    setBusyKey(key);
    const row = rows.find((x) => x.department === dept && x.position === position);
    const ok = await run(
      row
        ? supabase.from("recruitment_positions").update({ enabled: next }).eq("id", row.id)
        : supabase
            .from("recruitment_positions")
            .insert({ period_id: period.id, department: dept, position, enabled: next }),
    );
    setBusyKey(null);
    if (!ok) {
      setLocal((s) => {
        const n = { ...s };
        delete n[key];
        return n;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 bg-black/15 backdrop-blur-sm"
        onClick={requestClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Cấu hình đợt tuyển ${period.name}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-full w-full max-w-[550px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="relative shrink-0 border-b border-border/70 px-6 py-4">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">
              Cấu hình đợt tuyển
            </p>
            {dirty && (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
                Chưa lưu
              </span>
            )}
          </div>
          <input
            aria-label="Tên đợt tuyển"
            placeholder="Tên đợt tuyển *"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-transparent bg-transparent px-2 py-0.5 text-lg font-bold text-foreground outline-none transition-colors placeholder:font-semibold placeholder:text-muted-foreground/60 hover:border-border focus:border-input focus:bg-background"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block min-w-0 text-[11px] text-muted-foreground">
              Ngày bắt đầu *
              <DatePicker
                className="mt-0.5"
                value={f.starts_on}
                onChange={(val) => setF({ ...f, starts_on: val })}
              />
            </label>
            <label className="block min-w-0 text-[11px] text-muted-foreground">
              Ngày kết thúc *
              <DatePicker
                className="mt-0.5"
                value={f.ends_on}
                min={f.starts_on}
                onChange={(val) => setF({ ...f, ends_on: val })}
              />
            </label>
          </div>
          <textarea
            ref={descriptionRef}
            aria-label="Mô tả đợt tuyển"
            rows={2}
            placeholder="Thêm mô tả cho đợt tuyển…"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            className="mt-2 max-h-52 w-full resize-none overflow-y-auto rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs leading-relaxed text-foreground outline-none transition-colors [scrollbar-width:none] placeholder:text-muted-foreground/60 hover:border-border focus:border-input focus:bg-background [&::-webkit-scrollbar]:hidden"
          />
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ban &amp; vị trí tuyển dụng
              </h3>
              <span className="text-[11px] text-muted-foreground">
                {enabledCount} vị trí đang mở
              </span>
            </div>
            <PositionMatrix
              enabledOf={enabledOf}
              onToggle={(dept, position, next) => void toggle(dept, position, next)}
              busyKey={busyKey}
            />
          </section>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
          {discardAsk ? (
            <>
              <p className="mr-auto text-xs font-medium text-destructive">Có thay đổi chưa lưu.</p>
              <button
                type="button"
                onClick={() => setDiscardAsk(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
              >
                Bỏ thay đổi
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={requestClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={saveInfo}
                disabled={!dirty || busy}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Lưu thông tin
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------- shared position matrix

/** Ban & vị trí matrix shared by the create drawer and the config drawer. */
function PositionMatrix({
  enabledOf,
  onToggle,
  busyKey,
}: {
  enabledOf: (dept: string, position: string) => boolean;
  onToggle: (dept: string, position: string, next: boolean) => void;
  busyKey?: string | null;
}) {
  return (
    <>
      {RECRUIT_DEPTS.map((d) => {
        const deptPositions = positionsFor(d.id);
        const count = deptPositions.filter((p) => enabledOf(d.id, p)).length;
        return (
          <section
            key={d.id}
            className="overflow-hidden rounded-xl border border-border/70 bg-card"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-secondary/40 px-3 py-1.5">
              <h3 className="truncate text-[13px] font-semibold text-foreground">{d.name}</h3>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${count > 0 ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
              >
                {count}/{deptPositions.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-1 p-1">
              {deptPositions.map((position) => (
                <div
                  key={position}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-secondary/50"
                >
                  <span className="min-w-0 truncate text-[13px] text-foreground" title={position}>
                    {position}
                  </span>
                  <Switch
                    checked={enabledOf(d.id, position)}
                    disabled={busyKey === `${d.id}|${position}`}
                    onCheckedChange={(v) => onToggle(d.id, position, v)}
                    aria-label={`${d.name} — ${position}`}
                    className="shrink-0"
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------- create drawer

function CreatePeriodDrawer({ refresh, onClose }: { refresh: () => void; onClose: () => void }) {
  const [f, setF] = useState({
    name: "",
    description: "",
    starts_on: "",
    ends_on: "",
    status: "draft",
  });
  /** Positions live in local state until the period row exists, then they are inserted with it. */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [discardAsk, setDiscardAsk] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrow(descriptionRef, f.description);

  const posKey = (dept: string, position: string) => `${dept}|${position}`;
  const enabledOf = (dept: string, position: string) => !!selected[posKey(dept, position)];
  const togglePosition = (dept: string, position: string, next: boolean) =>
    setSelected((s) => ({ ...s, [posKey(dept, position)]: next }));
  const enabledCount = RECRUIT_DEPTS.reduce(
    (n, d) => n + positionsFor(d.id).filter((p) => enabledOf(d.id, p)).length,
    0,
  );

  const dirty = !!(
    f.name.trim() ||
    f.description.trim() ||
    f.starts_on ||
    f.ends_on ||
    enabledCount > 0
  );
  const requestClose = () => {
    if (dirty) setDiscardAsk(true);
    else onClose();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (discardAsk) setDiscardAsk(false);
      else if (dirty) setDiscardAsk(true);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, dirty, discardAsk]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 3) return void toast.error("Tên đợt tuyển tối thiểu 3 ký tự.");
    if (!f.starts_on || !f.ends_on)
      return void toast.error("Vui lòng chọn ngày bắt đầu và ngày kết thúc.");
    if (f.ends_on <= f.starts_on) return void toast.error("Ngày kết thúc phải sau ngày bắt đầu.");
    setBusy(true);
    const { data: row, error } = await supabase
      .from("recruitment_periods")
      .insert({
        name: f.name.trim(),
        description: f.description.trim(),
        starts_on: f.starts_on,
        ends_on: f.ends_on,
        status: f.status,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) return void toast.error(friendlyError(error));
    const periodId = (row as { id: string } | null)?.id;
    const chosen = Object.entries(selected)
      .filter(([, on]) => on)
      .map(([key]) => {
        const [department, position] = key.split("|");
        return { department: department ?? "", position: position ?? "" };
      })
      .filter((p) => p.department && p.position);
    if (periodId && chosen.length > 0) {
      const { error: posError } = await supabase.from("recruitment_positions").insert(
        chosen.map((p) => ({
          period_id: periodId,
          department: p.department,
          position: p.position,
          enabled: true,
        })),
      );
      if (posError) toast.error("Đã tạo đợt nhưng chưa lưu được vị trí: " + posError.message);
    }
    toast.success("Đã tạo đợt tuyển mới");
    refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 bg-black/15 backdrop-blur-sm"
        onClick={requestClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Tạo đợt tuyển mới"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-full w-full max-w-[550px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="relative shrink-0 border-b border-border/70 px-6 py-4">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">
                Đợt tuyển mới
              </p>
            </div>
            <input
              autoFocus
              aria-label="Tên đợt tuyển"
              placeholder="Tên đợt tuyển *"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-transparent bg-transparent px-2 py-0.5 text-lg font-bold text-foreground outline-none transition-colors placeholder:font-semibold placeholder:text-muted-foreground/60 hover:border-border focus:border-input focus:bg-background"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block min-w-0 text-[11px] text-muted-foreground">
                Ngày bắt đầu *
                <DatePicker
                  className="mt-0.5"
                  value={f.starts_on}
                  onChange={(val) => setF({ ...f, starts_on: val })}
                />
              </label>
              <label className="block min-w-0 text-[11px] text-muted-foreground">
                Ngày kết thúc *
                <DatePicker
                  className="mt-0.5"
                  value={f.ends_on}
                  min={f.starts_on}
                  onChange={(val) => setF({ ...f, ends_on: val })}
                />
              </label>
            </div>
            <textarea
              ref={descriptionRef}
              aria-label="Mô tả đợt tuyển"
              rows={2}
              placeholder="Thêm mô tả cho đợt tuyển…"
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              className="mt-2 max-h-52 w-full resize-none overflow-y-auto rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs leading-relaxed text-foreground outline-none transition-colors [scrollbar-width:none] placeholder:text-muted-foreground/60 hover:border-border focus:border-input focus:bg-background [&::-webkit-scrollbar]:hidden"
            />
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Trạng thái ban đầu
              </h3>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger aria-label="Trạng thái ban đầu" className={DRAWER_SELECT_TRIGGER}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={DRAWER_SELECT_CONTENT}>
                  <SelectItem value="draft" className={DRAWER_SELECT_ITEM}>
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT["draft"]}`}
                      />
                      Nháp — chưa nhận hồ sơ
                    </span>
                  </SelectItem>
                  <SelectItem value="open" className={DRAWER_SELECT_ITEM}>
                    <span className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT["open"]}`} />
                      Mở ngay — nhận hồ sơ từ hôm nay
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Chỉ một đợt tuyển được ở trạng thái “Đang mở” tại một thời điểm.
              </p>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ban &amp; vị trí tuyển dụng
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {enabledCount} vị trí đang mở
                </span>
              </div>
              <PositionMatrix enabledOf={enabledOf} onToggle={togglePosition} />
              {f.status === "open" && enabledCount === 0 && (
                <p className="rounded-lg bg-gold/10 px-3 py-2 text-[11px] text-gold">
                  Đợt mở nhận đơn cần ít nhất một vị trí để ứng viên chọn ở biểu mẫu /join.
                </p>
              )}
            </section>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
            {discardAsk ? (
              <>
                <p className="mr-auto text-xs font-medium text-destructive">
                  Có thay đổi chưa lưu.
                </p>
                <button
                  type="button"
                  onClick={() => setDiscardAsk(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Ở lại
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
                >
                  Bỏ thay đổi
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={requestClose}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Tạo đợt tuyển
                </button>
              </>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------- question bank tab

function Questions({ data, run, confirm }: { data: Data; run: Run; confirm: Confirm }) {
  const [dept, setDept] = useState<string>("design");
  const [newTopic, setNewTopic] = useState({ title: "", description: "", position: "" });
  const deptKey = dept === "common" ? null : dept;
  const topics = data.topics.filter((t) => t.department === deptKey);

  const loadBank = async () => {
    for (const b of QUESTION_BANK) {
      for (const [i, t] of b.topics.entries()) {
        const { data: row, error } = await supabase
          .from("recruitment_topics")
          .insert({
            department: b.department,
            position: b.position,
            title: t.title,
            description: t.description,
            sort_order: i,
          })
          .select("id")
          .single();
        if (error || !row) {
          await run(Promise.resolve({ error: error ?? { message: "Lỗi" } }));
          return;
        }
        await supabase.from("recruitment_questions").insert(
          t.questions.map((q, j) => ({
            topic_id: row.id,
            prompt: q.prompt,
            kind: q.kind ?? "long",
            options: q.options ?? [],
            required: !!q.required,
            sort_order: j,
          })),
        );
      }
    }
    await run(Promise.resolve({ error: null }), "Đã nạp bộ câu hỏi TML.");
  };

  const swap = (
    list: { id: string; sort_order: number }[],
    i: number,
    j: number,
    table: "recruitment_topics" | "recruitment_questions",
  ) => {
    const a = list[i],
      b = list[j];
    if (!a || !b) return;
    run(
      Promise.all([
        supabase.from(table).update({ sort_order: j }).eq("id", a.id),
        supabase.from(table).update({ sort_order: i }).eq("id", b.id),
      ]).then((r) => ({ error: r.find((x) => x.error)?.error ?? null })),
    );
  };

  return (
    <div className="mt-6 space-y-5">
      {data.topics.length === 0 && (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-accent/40 p-5 text-sm">
          Chưa có câu hỏi nào.{" "}
          <button className="ml-2 font-semibold text-primary underline" onClick={loadBank}>
            Nạp bộ câu hỏi TML đã soạn
          </button>
        </div>
      )}
      <select className={inp} value={dept} onChange={(e) => setDept(e.target.value)}>
        {RECRUIT_DEPTS.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
        <option value="common">Câu hỏi chung (mọi ứng viên)</option>
      </select>
      {topics.map((t, ti) => {
        const qs = data.questions.filter((q) => q.topic_id === t.id);
        return (
          <div
            key={t.id}
            className={`rounded-2xl border border-border bg-card p-5 ${t.visible ? "" : "opacity-60"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={`${inp} flex-1 font-semibold`}
                defaultValue={t.title}
                onBlur={(e) =>
                  e.target.value !== t.title &&
                  run(
                    supabase
                      .from("recruitment_topics")
                      .update({ title: e.target.value })
                      .eq("id", t.id),
                  )
                }
              />
              <span className="text-xs text-muted-foreground">{t.position ?? "Mọi vị trí"}</span>
              <button
                className={btn}
                onClick={() => swap(topics, ti, ti - 1, "recruitment_topics")}
                aria-label="Đưa chủ đề lên"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                className={btn}
                onClick={() => swap(topics, ti, ti + 1, "recruitment_topics")}
                aria-label="Đưa chủ đề xuống"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                className={btn}
                onClick={() =>
                  run(
                    supabase
                      .from("recruitment_topics")
                      .update({ visible: !t.visible })
                      .eq("id", t.id),
                  )
                }
                aria-label={t.visible ? "Ẩn chủ đề" : "Hiện chủ đề"}
              >
                {t.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button
                className={btn}
                aria-label="Xóa chủ đề"
                onClick={async () => {
                  if (
                    !(await confirm({
                      title: "Xóa chủ đề?",
                      description:
                        "Toàn bộ câu hỏi trong chủ đề này cũng sẽ bị xóa. Thao tác không thể hoàn tác.",
                      confirmLabel: "Xóa chủ đề",
                      destructive: true,
                    }))
                  )
                    return;
                  run(supabase.from("recruitment_topics").delete().eq("id", t.id));
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
            <input
              className={`${inp} mt-2 w-full text-xs`}
              defaultValue={t.description}
              placeholder="Mô tả ngắn"
              onBlur={(e) =>
                e.target.value !== t.description &&
                run(
                  supabase
                    .from("recruitment_topics")
                    .update({ description: e.target.value })
                    .eq("id", t.id),
                )
              }
            />
            <div className="mt-4 space-y-2">
              {qs.map((q, qi) => (
                <div
                  key={q.id}
                  className={`grid gap-2 rounded-lg bg-secondary p-3 md:grid-cols-12 ${q.visible ? "" : "opacity-60"}`}
                >
                  <input
                    className={`${inp} md:col-span-5`}
                    defaultValue={q.prompt}
                    onBlur={(e) =>
                      e.target.value !== q.prompt &&
                      run(
                        supabase
                          .from("recruitment_questions")
                          .update({ prompt: e.target.value })
                          .eq("id", q.id),
                      )
                    }
                  />
                  <select
                    className={`${inp} md:col-span-2`}
                    value={q.kind}
                    onChange={(e) =>
                      run(
                        supabase
                          .from("recruitment_questions")
                          .update({ kind: e.target.value })
                          .eq("id", q.id),
                      )
                    }
                  >
                    {Object.entries(QUESTION_KINDS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input
                    className={`${inp} md:col-span-3`}
                    placeholder="Lựa chọn, cách nhau bởi dấu phẩy"
                    defaultValue={q.options.join(", ")}
                    disabled={!["single", "multi", "dropdown"].includes(q.kind)}
                    onBlur={(e) =>
                      run(
                        supabase
                          .from("recruitment_questions")
                          .update({
                            options: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                          .eq("id", q.id),
                      )
                    }
                  />
                  <div className="flex items-center gap-1 md:col-span-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) =>
                          run(
                            supabase
                              .from("recruitment_questions")
                              .update({ required: e.target.checked })
                              .eq("id", q.id),
                          )
                        }
                      />
                      Bắt buộc
                    </label>
                    <button
                      className="p-1"
                      aria-label="Đưa câu hỏi lên"
                      onClick={() => swap(qs, qi, qi - 1, "recruitment_questions")}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1"
                      aria-label="Đưa câu hỏi xuống"
                      onClick={() => swap(qs, qi, qi + 1, "recruitment_questions")}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1"
                      aria-label={q.visible ? "Ẩn câu hỏi" : "Hiện câu hỏi"}
                      onClick={() =>
                        run(
                          supabase
                            .from("recruitment_questions")
                            .update({ visible: !q.visible })
                            .eq("id", q.id),
                        )
                      }
                    >
                      {q.visible ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      className="p-1"
                      aria-label="Xóa câu hỏi"
                      onClick={async () => {
                        if (
                          !(await confirm({
                            title: "Xóa câu hỏi?",
                            description:
                              "Câu hỏi này sẽ bị xóa khỏi chủ đề và không thể khôi phục.",
                            confirmLabel: "Xóa câu hỏi",
                            destructive: true,
                          }))
                        )
                          return;
                        run(supabase.from("recruitment_questions").delete().eq("id", q.id));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                className={`${btn} inline-flex items-center gap-1`}
                onClick={() =>
                  run(
                    supabase
                      .from("recruitment_questions")
                      .insert({ topic_id: t.id, prompt: "Câu hỏi mới", sort_order: qs.length }),
                  )
                }
              >
                <Plus className="h-4 w-4" />
                Thêm câu hỏi
              </button>
            </div>
          </div>
        );
      })}
      <form
        className="grid gap-2 rounded-2xl border border-dashed border-border p-5 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newTopic.title) return;
          run(
            supabase.from("recruitment_topics").insert({
              department: deptKey,
              position: newTopic.position || null,
              title: newTopic.title,
              description: newTopic.description,
              sort_order: topics.length,
            }),
            "Đã thêm chủ đề.",
          ).then((ok) => {
            if (ok) setNewTopic({ title: "", description: "", position: "" });
          });
        }}
      >
        <input
          className={inp}
          placeholder={`Chủ đề mới cho ${deptName(deptKey)}`}
          value={newTopic.title}
          onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
        />
        <input
          className={inp}
          placeholder="Mô tả"
          value={newTopic.description}
          onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
        />
        <select
          className={inp}
          value={newTopic.position}
          disabled={!deptKey}
          onChange={(e) => setNewTopic({ ...newTopic, position: e.target.value })}
        >
          <option value="">Mọi vị trí</option>
          {deptKey && positionsFor(deptKey).map((p) => <option key={p}>{p}</option>)}
        </select>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Thêm chủ đề
        </button>
      </form>
    </div>
  );
}
