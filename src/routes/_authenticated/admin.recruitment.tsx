import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Eye,
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
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { QuestionBankStudio } from "@/components/admin/recruitment/QuestionBankStudio";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { FormField } from "@/components/admin/kit/FormField";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
import { StatusPill, type StatusTone } from "@/components/admin/kit/StatusPill";
import { useConfirm } from "@/components/admin/kit/useConfirm";
import { supabase } from "@/integrations/supabase/client";
import {
  PERIOD_STATUS,
  RECRUIT_DEPTS,
  periodStatus,
  periodStatusLabel,
  positionsFor,
} from "@/lib/recruitment";

export const Route = createFileRoute("/_authenticated/admin/recruitment")({
  staticData: { sitemap: false },
  component: RecruitmentAdmin,
});

const DAY_MS = 86_400_000;

const PERIOD_STATUS_TONE: Record<string, StatusTone> = {
  draft: "neutral",
  open: "success",
  paused: "gold",
  ended: "neutral",
  cancelled: "danger",
};

const STATUS_DOT: Record<string, string> = {
  draft: "bg-muted-foreground/50",
  open: "bg-success",
  paused: "bg-gold",
  ended: "bg-muted-foreground/50",
  cancelled: "bg-destructive",
};

const PERIOD_COLS: AdminColumn[] = [
  { key: "name", label: "Đợt tuyển" },
  { key: "time", label: "Thời gian", className: "w-[200px]" },
  { key: "positions", label: "Vị trí", className: "w-[110px]" },
  { key: "apps", label: "Hồ sơ", className: "w-[100px]" },
  { key: "status", label: "Trạng thái", className: "w-[130px]" },
  { key: "actions", label: "Thao tác", srOnly: true, className: "w-[230px] text-right" },
];

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
  const [p, pos, t, q] = await Promise.all([
    supabase.from("recruitment_periods").select("*").order("created_at", { ascending: false }),
    supabase.from("recruitment_positions").select("*"),
    supabase.from("recruitment_topics").select("*").order("sort_order"),
    supabase.from("recruitment_questions").select("*").order("sort_order"),
  ]);
  const periods = (p.data ?? []) as Period[];
  const counts = await Promise.all(
    periods.map((period) =>
      supabase
        .from("candidate_applications")
        .select("id", { count: "exact", head: true })
        .eq("period_id", period.id),
    ),
  );
  const appCountByPeriod: Record<string, number> = {};
  periods.forEach((period, i) => {
    appCountByPeriod[period.id] = counts[i]?.count ?? 0;
  });
  return {
    periods,
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

function TabLabel({ text, count }: { text: string; count: number }) {
  return (
    <span className="flex items-center gap-2">
      {text}
      <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold leading-relaxed text-muted-foreground">
        {count}
      </span>
    </span>
  );
}

function RecruitmentAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-recruitment"], queryFn: load });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-recruitment"] });
    qc.invalidateQueries({ queryKey: ["open-recruitment"] });
  };
  const [tab, setTab] = useState<"periods" | "questions">("periods");
  const [previewOpen, setPreviewOpen] = useState(false);
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
    <section className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Đợt tuyển & Câu hỏi"
        actions={
          tab === "periods" ? (
            <Button type="button" size="admin" onClick={() => setCreating(true)}>
              <Plus /> Tạo đợt tuyển
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Chọn mục quản lý tuyển dụng"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setPreviewOpen(false);
          }}
          options={[
            {
              value: "periods",
              label: <TabLabel text="Đợt tuyển dụng" count={data?.periods.length ?? 0} />,
            },
            {
              value: "questions",
              label: <TabLabel text="Ngân hàng câu hỏi" count={data?.questions.length ?? 0} />,
            },
          ]}
        />
        {tab === "questions" && (
          <Button
            type="button"
            variant="outline"
            size="admin"
            onClick={() => setPreviewOpen(true)}
            className="border-primary/40 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground [&_svg]:size-3.5"
          >
            <Eye aria-hidden /> Xem trước dạng ứng viên
          </Button>
        )}
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
        <QuestionBankStudio
          data={data}
          run={run}
          confirm={confirm}
          previewOpen={previewOpen}
          onClosePreview={() => setPreviewOpen(false)}
        />
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
      <EmptyState
        className="mt-6"
        title="Chưa có đợt tuyển nào"
        description="Tạo đợt tuyển đầu tiên để bắt đầu nhận hồ sơ ứng viên."
        action={
          <Button type="button" size="admin" onClick={onCreate}>
            <Plus /> Tạo đợt tuyển
          </Button>
        }
      />
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
          <EmptyState title="Chưa có đợt tuyển nào khác." />
        ) : (
          <AdminTable columns={PERIOD_COLS} minWidth="min-w-[860px]">
            {previous.map((p) => (
              <AdminTableRow key={p.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-foreground">{p.name}</div>
                  {p.description && (
                    <div
                      className="mt-0.5 truncate text-xs text-muted-foreground"
                      title={p.description}
                    >
                      {p.description}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {fmtDate(p.starts_on)} → {fmtDate(p.ends_on)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">
                  <span className="font-mono font-semibold text-foreground">{enabledOf(p.id)}</span>
                  <span className="text-muted-foreground"> vị trí mở</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">
                  <span className="font-mono font-semibold text-foreground">
                    {data.appCountByPeriod[p.id] ?? 0}
                  </span>
                  <span className="text-muted-foreground"> hồ sơ</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusPill tone={PERIOD_STATUS_TONE[periodStatus(p.status)] ?? "neutral"}>
                    {periodStatusLabel(p.status)}
                  </StatusPill>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                    {canReopen(p) && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="admin-sm"
                          onClick={() => openPeriod(p)}
                          title="Chuyển đợt sang trạng thái Đang mở"
                          className="text-primary hover:text-primary [&_svg]:size-3.5"
                        >
                          <Play aria-hidden /> Mở đợt
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="admin-sm"
                          onClick={() => onConfigure(p.id)}
                          title="Cấu hình thông tin, ban & vị trí tuyển"
                          className="[&_svg]:size-3.5"
                        >
                          <Settings2 aria-hidden /> Cấu hình
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="destructive-outline"
                      size="admin-icon"
                      onClick={() => removePeriod(p)}
                      aria-label={`Xóa đợt ${p.name}`}
                      title="Xóa đợt tuyển"
                      className="[&_svg]:size-3.5"
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </td>
              </AdminTableRow>
            ))}
          </AdminTable>
        )}
      </section>
    </div>
  );
}

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
            className="-ml-1 h-9 w-auto gap-1.5 rounded-lg border-0 bg-transparent px-2 text-[13px] font-semibold text-foreground shadow-none hover:bg-accent focus:ring-0 data-[state=open]:bg-accent [@media(pointer:coarse)]:h-11"
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

        <Button
          type="button"
          size="admin"
          onClick={onConfigure}
          aria-label="Cấu hình đợt tuyển"
          title="Sửa thông tin, bật/tắt ban & vị trí tuyển"
          className="shrink-0 [@media(pointer:coarse)]:h-11"
        >
          <Settings2 aria-hidden />
          <span className="hidden @min-[560px]:inline">Cấu hình</span>
        </Button>
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
          {/* eslint-disable-next-line no-restricted-syntax -- ô số liệu bấm được phủ toàn bộ, Button của kit không hợp */}
          <button
            type="button"
            onClick={onConfigure}
            title="Bấm để mở ma trận cấu hình vị trí"
            className="flex flex-col items-stretch justify-start rounded-xl border border-border/70 bg-secondary/40 p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
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
            className="flex flex-col items-stretch justify-start rounded-xl border border-border/70 bg-secondary/40 p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
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

type PeriodInfo = { name: string; description: string; starts_on: string; ends_on: string };

/** Tên, ngày và mô tả đợt tuyển, dùng chung cho drawer tạo mới và drawer cấu hình. */
function PeriodInfoFields({
  value,
  onChange,
  descriptionRef,
  autoFocusName = false,
}: {
  value: PeriodInfo;
  onChange: (patch: Partial<PeriodInfo>) => void;
  descriptionRef: RefObject<HTMLTextAreaElement | null>;
  autoFocusName?: boolean;
}) {
  return (
    <section className="space-y-3">
      <FormField label="Tên đợt tuyển" required>
        {(field) => (
          <AdminInput
            {...field}
            autoFocus={autoFocusName}
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="VD: Tuyển thành viên Gen 5"
          />
        )}
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Ngày bắt đầu" required>
          {(field) => (
            <DatePicker
              id={field.id}
              value={value.starts_on}
              onChange={(val) => onChange({ starts_on: val })}
            />
          )}
        </FormField>
        <FormField label="Ngày kết thúc" required>
          {(field) => (
            <DatePicker
              id={field.id}
              value={value.ends_on}
              {...(value.starts_on ? { min: value.starts_on } : {})}
              onChange={(val) => onChange({ ends_on: val })}
            />
          )}
        </FormField>
      </div>
      <FormField label="Mô tả">
        {(field) => (
          <AdminTextarea
            {...field}
            ref={descriptionRef}
            rows={2}
            placeholder="Thêm mô tả cho đợt tuyển…"
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="max-h-52 min-h-0 resize-none overflow-y-auto leading-relaxed"
          />
        )}
      </FormField>
    </section>
  );
}

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

  const dismiss = () => {
    if (discardAsk) setDiscardAsk(false);
    else requestClose();
  };

  useAutoGrow(descriptionRef, f.description);

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
    <AdminDrawer
      title="Cấu hình đợt tuyển"
      subtitle={
        <span className="flex items-center gap-1.5">
          <span className="truncate">{period.name}</span>
          {dirty && (
            <StatusPill tone="gold" dot={false}>
              Chưa lưu
            </StatusPill>
          )}
        </span>
      }
      onClose={dismiss}
      dismissible={!busy}
      bodyClassName="space-y-5"
      footer={
        discardAsk ? (
          <>
            <p className="mr-auto text-xs font-medium text-destructive">Có thay đổi chưa lưu.</p>
            <Button
              type="button"
              variant="outline"
              size="admin"
              onClick={() => setDiscardAsk(false)}
            >
              Ở lại
            </Button>
            <Button type="button" variant="destructive" size="admin" onClick={onClose}>
              Bỏ thay đổi
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" size="admin" onClick={requestClose}>
              Đóng
            </Button>
            <Button type="button" size="admin-lg" onClick={saveInfo} disabled={!dirty || busy}>
              {busy && <Loader2 aria-hidden className="animate-spin" />}
              Lưu thông tin
            </Button>
          </>
        )
      }
    >
      <PeriodInfoFields
        value={f}
        onChange={(patch) => setF({ ...f, ...patch })}
        descriptionRef={descriptionRef}
      />
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ban &amp; vị trí tuyển dụng
          </h3>
          <span className="text-[11px] text-muted-foreground">{enabledCount} vị trí đang mở</span>
        </div>
        <PositionMatrix
          enabledOf={enabledOf}
          onToggle={(dept, position, next) => void toggle(dept, position, next)}
          busyKey={busyKey}
        />
      </section>
    </AdminDrawer>
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

  const dismiss = () => {
    if (discardAsk) setDiscardAsk(false);
    else requestClose();
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
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
    <AdminDrawer
      title="Tạo đợt tuyển mới"
      onClose={dismiss}
      dismissible={!busy}
      onSubmit={submit}
      bodyClassName="space-y-5"
      footer={
        discardAsk ? (
          <>
            <p className="mr-auto text-xs font-medium text-destructive">Có thay đổi chưa lưu.</p>
            <Button
              type="button"
              variant="outline"
              size="admin"
              onClick={() => setDiscardAsk(false)}
            >
              Ở lại
            </Button>
            <Button type="button" variant="destructive" size="admin" onClick={onClose}>
              Bỏ thay đổi
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" size="admin" onClick={requestClose}>
              Hủy
            </Button>
            <Button type="submit" size="admin-lg" disabled={busy}>
              {busy && <Loader2 aria-hidden className="animate-spin" />}
              Tạo đợt tuyển
            </Button>
          </>
        )
      }
    >
      <PeriodInfoFields
        value={f}
        onChange={(patch) => setF({ ...f, ...patch })}
        descriptionRef={descriptionRef}
        autoFocusName
      />

      <FormField
        label="Trạng thái ban đầu"
        hint="Chỉ một đợt tuyển được ở trạng thái “Đang mở” tại một thời điểm."
      >
        {(field) => (
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
            <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="draft" className="text-xs">
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT["draft"]}`} />
                  Nháp — chưa nhận hồ sơ
                </span>
              </SelectItem>
              <SelectItem value="open" className="text-xs">
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT["open"]}`} />
                  Mở ngay — nhận hồ sơ từ hôm nay
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </FormField>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ban &amp; vị trí tuyển dụng
          </h3>
          <span className="text-[11px] text-muted-foreground">{enabledCount} vị trí đang mở</span>
        </div>
        <PositionMatrix enabledOf={enabledOf} onToggle={togglePosition} />
        {f.status === "open" && enabledCount === 0 && (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-[11px] text-warning-foreground">
            Đợt mở nhận đơn cần ít nhất một vị trí để ứng viên chọn ở biểu mẫu /join.
          </p>
        )}
      </section>
    </AdminDrawer>
  );
}
