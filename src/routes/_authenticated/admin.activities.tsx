import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "motion/react";
import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FilePen,
  Inbox,
  Phone,
  Plus,
  Search,
  Ticket,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/programs";
import { matchesSearch } from "@/lib/search";
import {
  ACTIVITY_BUCKET,
  CATEGORY_LABEL,
  LOCATION_LABEL,
  MANUAL_LABEL,
  REG_STATUS,
  fmtDateTime,
  liveStatus,
  registrationOpen,
  withBanners,
  type ActivityCategory,
  type ActivityRow,
  type LocationType,
  type ManualStatus,
} from "@/lib/activities";

import { useAdminAccess } from "./admin";
import { canReviewNews } from "@/lib/admin-permissions";
import { TrashList, useConfirm } from "@/components/admin/Trash";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
export const Route = createFileRoute("/_authenticated/admin/activities")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Hoạt động | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: ActivitiesAdmin,
});

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const CATS = Object.keys(CATEGORY_LABEL).filter((k) => k !== "education") as ActivityCategory[];
type Form = Omit<ActivityRow, "id" | "created_at" | "deleted_at" | "banner"> & { id?: string };
const EMPTY: Form = {
  slug: "",
  title: "",
  short_description: "",
  description: "",
  category: "workshop",
  banner_path: "",
  start_time: null,
  end_time: null,
  location_type: "online",
  location_detail: "",
  require_registration: true,
  registration_url: "",
  registration_deadline: null,
  max_participants: 0,
  facebook_url: "",
  website_url: "",
  auto_status: true,
  manual_status: "draft",
};
const toLocal = (iso: string | null) =>
  iso
    ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);
function useCanPublish() {
  const a = useAdminAccess().data;
  return !!a && canReviewNews(a.roles, a.department);
}

type Group = "ongoing" | "upcoming" | "unscheduled" | "ended" | "cancelled";

const GROUPS: { key: Group; label: string; defaultOpen: boolean }[] = [
  { key: "ongoing", label: "Đang diễn ra", defaultOpen: true },
  { key: "upcoming", label: "Sắp diễn ra", defaultOpen: true },
  { key: "unscheduled", label: "Chưa có lịch", defaultOpen: true },
  { key: "ended", label: "Đã kết thúc", defaultOpen: false },
  { key: "cancelled", label: "Đã hủy", defaultOpen: false },
];

/** Lifecycle bucket for the admin list; activities without a start time get their own group. */
function groupOf(a: ActivityRow, now = Date.now()): Group {
  const s = liveStatus(a, now);
  if (s === "cancelled") return "cancelled";
  if (!a.start_time) return "unscheduled";
  return s;
}

const ts = (iso: string | null) => (iso ? Date.parse(iso) : 0);

/** Soonest first while upcoming/ongoing, most recent first once in the past. */
const GROUP_SORT: Record<Group, (a: ActivityRow, b: ActivityRow) => number> = {
  ongoing: (a, b) => ts(a.end_time ?? a.start_time) - ts(b.end_time ?? b.start_time),
  upcoming: (a, b) => ts(a.start_time) - ts(b.start_time),
  unscheduled: (a, b) => ts(b.created_at) - ts(a.created_at),
  ended: (a, b) => ts(b.start_time) - ts(a.start_time),
  cancelled: (a, b) => ts(b.start_time) - ts(a.start_time),
};

const DAY = 86_400_000;
const dayStart = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** Second line of the time column. */
function timeHint(a: ActivityRow, g: Group, now = Date.now()): string {
  if (g === "unscheduled") return "Chưa chốt ngày";
  if (g === "ongoing") return a.end_time ? `Đến ${fmtDateTime(a.end_time)}` : "Đang diễn ra";
  if (g === "upcoming") {
    const days = Math.round((dayStart(ts(a.start_time)) - dayStart(now)) / DAY);
    return days <= 0 ? "Hôm nay" : days === 1 ? "Ngày mai" : `Còn ${days} ngày`;
  }
  return a.end_time ? `Kết thúc ${fmtDateTime(a.end_time)}` : "";
}

const MANUAL_TONE: Record<ManualStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  hidden: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  cancelled: "bg-destructive/10 text-destructive",
};

const ACT_COLS = [
  { label: "Hoạt động", className: "" },
  { label: "Thời gian", className: "w-[190px]" },
  { label: "Đăng ký", className: "w-[160px]" },
  { label: "Hiển thị", className: "w-[120px]" },
  { label: "Thao tác", className: "w-[150px] text-right" },
] as const;

/** Single status label per activity: the group already conveys the time lifecycle. */
function StatusPill({ status }: { status: ManualStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${MANUAL_TONE[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {MANUAL_LABEL[status]}
    </span>
  );
}

function Thumb({ src, className = "" }: { src?: string | undefined; className?: string }) {
  return src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={`shrink-0 rounded-lg bg-muted object-cover ${className}`}
    />
  ) : (
    <div
      className={`grid shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground ${className}`}
    >
      <CalendarDays className="h-4 w-4" />
    </div>
  );
}

function RegCell({ a, count }: { a: ActivityRow; count: number }) {
  if (a.registration_url)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ExternalLink className="h-3 w-3" />
        Form bên ngoài
      </span>
    );
  const max = a.max_participants;
  const full = max > 0 && count >= max;
  const pct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium tabular-nums text-foreground">
        {count}
        {max > 0 && <span className="text-muted-foreground">/{max}</span>}
        {full && <span className="ml-1.5 text-[10px] font-semibold text-amber-600">Đã đủ</span>}
      </p>
      {max > 0 && (
        <div className="mt-1 h-1 w-full max-w-[110px] overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${full ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className="mt-1 truncate text-[11px] text-muted-foreground">
        {!registrationOpen(a)
          ? "Đã đóng đăng ký"
          : a.registration_deadline
            ? `Hạn ${fmtDateTime(a.registration_deadline)}`
            : "Không đặt hạn"}
      </p>
    </div>
  );
}

type RowActionProps = {
  a: ActivityRow;
  canPublish: boolean;
  onDuplicate: (a: ActivityRow) => void;
  onTogglePublish: (a: ActivityRow) => void;
  onRemove: (a: ActivityRow) => void;
};

const ICON_BTN =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

function RowActions({ a, canPublish, onDuplicate, onTogglePublish, onRemove }: RowActionProps) {
  const published = a.manual_status === "published";
  return (
    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      {published && (
        <Link
          to="/activities/$activityId"
          params={{ activityId: a.slug }}
          target="_blank"
          title="Xem trang công khai"
          aria-label="Xem trang công khai"
          className={ICON_BTN}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      )}
      <button
        type="button"
        title="Sao chép"
        aria-label="Sao chép"
        onClick={() => onDuplicate(a)}
        className={ICON_BTN}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      {canPublish && (
        <button
          type="button"
          title={published ? "Tạm ẩn" : "Duyệt & Đăng"}
          aria-label={published ? "Tạm ẩn" : "Duyệt & Đăng"}
          onClick={() => onTogglePublish(a)}
          className={ICON_BTN}
        >
          {published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
      {(canPublish || a.manual_status === "draft") && (
        <button
          type="button"
          title="Chuyển vào Thùng rác"
          aria-label="Chuyển vào Thùng rác"
          onClick={() => onRemove(a)}
          className={`${ICON_BTN} text-destructive hover:bg-destructive/10 hover:text-destructive`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function ActivityGroup({
  group,
  label,
  rows,
  open,
  onToggle,
  counts,
  now,
  canPublish,
  onEdit,
  ...actions
}: {
  group: Group;
  label: string;
  rows: ActivityRow[];
  open: boolean;
  onToggle: () => void;
  counts: Map<string, number> | undefined;
  now: number;
  onEdit: (a: ActivityRow) => void;
} & Omit<RowActionProps, "a">) {
  const canEdit = (a: ActivityRow) => canPublish || a.manual_status === "draft";
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="mb-2 flex cursor-pointer items-center gap-2 px-1"
      >
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        <h3 className="text-sm font-bold tracking-tight text-foreground">{label}</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {rows.length}
        </span>
      </button>
      {open && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-xs md:block">
            <div className="custom-scrollbar overflow-x-auto">
              <table className="w-full min-w-[860px] table-fixed text-sm">
                <thead className="border-b border-border/60 bg-secondary/30 text-left text-xs text-muted-foreground">
                  <tr>
                    {ACT_COLS.map((col) => (
                      <th key={col.label} className={`p-3 font-semibold ${col.className}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr
                      key={a.id}
                      onClick={canEdit(a) ? () => onEdit(a) : undefined}
                      className={`border-t border-border/60 transition-colors ${canEdit(a) ? "cursor-pointer hover:bg-accent/50" : ""}`}
                    >
                      <td className="p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Thumb src={a.banner} className="h-[45px] w-20" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground" title={a.title}>
                              {a.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {CATEGORY_LABEL[a.category]} · {LOCATION_LABEL[a.location_type]}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <p
                          className={`text-xs font-medium ${a.start_time ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {a.start_time ? fmtDateTime(a.start_time) : "Chưa có lịch"}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {timeHint(a, group, now)}
                        </p>
                      </td>
                      <td className="p-3">
                        <RegCell a={a} count={counts?.get(a.id) ?? 0} />
                      </td>
                      <td className="p-3">
                        <StatusPill status={a.manual_status} />
                      </td>
                      <td className="p-3">
                        <RowActions a={a} canPublish={canPublish} {...actions} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2 md:hidden">
            {rows.map((a) => (
              <article
                key={a.id}
                onClick={canEdit(a) ? () => onEdit(a) : undefined}
                className={`flex gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs ${canEdit(a) ? "cursor-pointer active:bg-accent/50" : ""}`}
              >
                <Thumb src={a.banner} className="aspect-video w-24 self-start" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {a.start_time ? fmtDateTime(a.start_time) : "Chưa có lịch"}
                    {timeHint(a, group, now) && a.start_time ? ` · ${timeHint(a, group, now)}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill status={a.manual_status} />
                    {!a.registration_url && (
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {counts?.get(a.id) ?? 0}
                        {a.max_participants > 0 ? `/${a.max_participants}` : ""} đăng ký
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <RowActions a={a} canPublish={canPublish} {...actions} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const TABS = [
  ["list", "Hoạt động"],
  ["regs", "Đơn đăng ký"],
  ["audit", "Nhật ký thay đổi"],
  ["trash", "Thùng rác"],
] as const;

function ActivitiesAdmin() {
  const [tab, setTab] = useState<"list" | "regs" | "audit" | "trash">("list");
  const [regsPreset, setRegsPreset] = useState("");
  const isAdmin = !!useAdminAccess().data?.roles.includes("admin");
  const canPublish = useCanPublish();
  const acts = useAllActivities();
  const regs = useAllRegs(canPublish);
  const pendingRegs = (regs.data ?? []).filter((r) => r.status === "PENDING").length;
  const openTab = (k: typeof tab) => {
    setRegsPreset("");
    setTab(k);
  };
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <div className="custom-scrollbar max-w-full overflow-x-auto">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-muted/60 p-1">
          {TABS.filter(([k]) => canPublish || k === "list").map(([k, label]) => {
            const active = tab === k;
            const badge = k === "list" ? (acts.data?.length ?? 0) : k === "regs" ? pendingRegs : 0;
            return (
              <button
                key={k}
                type="button"
                onClick={() => openTab(k)}
                aria-pressed={active}
                className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:px-4 ${
                  active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="activities-tab-pill"
                    className="absolute inset-0 rounded-lg bg-primary shadow-xs"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {label}
                  {badge > 0 && (
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-semibold leading-relaxed ${
                        active
                          ? "bg-white/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {tab === "list" && (
        <ListTab
          {...(canPublish
            ? {
                onOpenPendingRegs: () => {
                  setRegsPreset("PENDING");
                  setTab("regs");
                },
              }
            : {})}
          pendingRegs={pendingRegs}
        />
      )}
      {tab === "regs" && <RegsTab initialStatus={regsPreset} />}
      {tab === "audit" && <AuditTab />}
      {tab === "trash" && (
        <TrashList
          table="activities"
          canHardDelete={isAdmin}
          invalidate={["admin-activities", "public-activities"]}
        />
      )}
    </div>
  );
}

function useAllActivities() {
  return useQuery({
    queryKey: ["admin-activities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return withBanners((data ?? []) as ActivityRow[]);
    },
  });
}

function useAllRegs(enabled = true) {
  return useQuery({
    queryKey: ["admin-activity-regs"],
    enabled,
    queryFn: async () =>
      ((
        await supabase
          .from("activity_registrations")
          .select("*")
          .order("created_at", { ascending: false })
      ).data ?? []) as Reg[],
  });
}

function ListTab({
  pendingRegs,
  onOpenPendingRegs,
}: {
  pendingRegs: number;
  onOpenPendingRegs?: () => void;
}) {
  const qc = useQueryClient();
  const acts = useAllActivities();
  const canPublish = useCanPublish();
  const counts = useQuery({
    queryKey: ["admin-activity-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("activity_registrations").select("activity_id");
      const m = new Map<string, number>();
      (data ?? []).forEach((r) => m.set(r.activity_id, (m.get(r.activity_id) ?? 0) + 1));
      return m;
    },
  });
  const [f, setFRaw] = useState<Form | null>(null);
  const [extMode, setExtMode] = useState(false);
  const setF = (v: Form | null) => {
    if (v && v.id !== f?.id) setExtMode(!!v.registration_url);
    if (v && !f) setExtMode(!!v.registration_url);
    setFRaw(v);
  };
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const [cat, setCat] = useState("");
  const [time, setTime] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<Group, boolean>>(
    () => Object.fromEntries(GROUPS.map((g) => [g.key, g.defaultOpen])) as Record<Group, boolean>,
  );
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-activities"] });
    qc.invalidateQueries({ queryKey: ["public-activities"] });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f) return;
    setErr("");
    if (f.start_time && f.end_time && f.end_time < f.start_time)
      return setErr("Thời gian kết thúc phải sau thời gian bắt đầu.");
    const norm = (u: string) => {
      const t = (u ?? "").trim();
      return !t ? "" : /^https?:\/\//i.test(t) ? t : `https://${t}`;
    };
    const links = {
      registration_url: extMode ? norm(f.registration_url) : "",
      facebook_url: norm(f.facebook_url),
      website_url: norm(f.website_url),
    };
    for (const u of Object.values(links))
      if (u) {
        try {
          new URL(u);
        } catch {
          return setErr(`Liên kết không hợp lệ: ${u}`);
        }
      }
    setBusy(true);
    const {
      id,
      banner: _b,
      ...row
    } = { ...f, ...links, require_registration: true, slug: slugify(f.slug || f.title) } as Form & {
      banner?: string;
    };
    const { error } = id
      ? await supabase.from("activities").update(row).eq("id", id)
      : await supabase.from("activities").insert(row);
    setBusy(false);
    if (error)
      return setErr(
        error.message.includes("slug") || error.code === "23505"
          ? "Slug đã tồn tại, hãy đổi slug khác."
          : error.message,
      );
    setF(null);
    refresh();
  };
  const upload = async (file: File) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024)
      return setErr("Ảnh JPG/PNG/WebP, tối đa 5MB.");
    setBusy(true);
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage
      .from(ACTIVITY_BUCKET)
      .upload(path, file, { contentType: file.type });
    setBusy(false);
    if (error) return setErr(error.message);
    setF({ ...f, banner_path: path });
  };
  const patch = async (a: ActivityRow, p: Partial<Omit<ActivityRow, "banner">>) => {
    const { error } = await supabase.from("activities").update(p).eq("id", a.id);
    if (error) setErr(error.message);
    else refresh();
  };
  const duplicate = (a: ActivityRow) => {
    const { id: _i, created_at: _c, deleted_at: _d, banner: _b, ...rest } = a;
    setF({
      ...rest,
      title: `${a.title} (bản sao)`,
      slug: `${a.slug}-copy-${Date.now().toString(36)}`,
      manual_status: "draft",
    });
  };
  const { confirm, dialog } = useConfirm();
  const remove = async (a: ActivityRow) => {
    if (
      !(await confirm({
        title: "Chuyển hoạt động vào Thùng rác?",
        description: `"${a.title}" sẽ bị ẩn khỏi website. Toàn bộ đơn đăng ký vẫn được bảo lưu và có thể khôi phục lại.`,
        confirmLabel: "Chuyển vào Thùng rác",
        destructive: true,
      }))
    )
      return;
    patch(a, { deleted_at: new Date().toISOString() } as Partial<Omit<ActivityRow, "banner">>);
  };

  const togglePublish = (a: ActivityRow) =>
    patch(a, { manual_status: a.manual_status === "published" ? "hidden" : "published" });

  const now = Date.now();
  const all = acts.data ?? [];
  const rows = all.filter(
    (a) =>
      (!st || a.manual_status === st) &&
      (!cat || a.category === cat) &&
      (!time || groupOf(a, now) === time) &&
      matchesSearch(`${a.title} ${a.slug}`, q),
  );
  const filtered = !!(q || st || cat || time);
  const clearFilters = () => {
    setQ("");
    setSt("");
    setCat("");
    setTime("");
  };
  const upcoming = all.filter((a) => groupOf(a, now) === "upcoming").length;
  const openRegs = all.filter((a) => a.manual_status === "published" && registrationOpen(a)).length;
  const drafts = all.filter((a) => a.manual_status === "draft").length;

  const header = (
    <AdminPageHeader
      title="Hoạt động"
      actions={
        f ? null : (
          <button
            type="button"
            onClick={() => setF({ ...EMPTY })}
            aria-label="Tạo hoạt động"
            title="Tạo hoạt động"
          >
            <Plus className="h-4 w-4" />
            Tạo hoạt động
          </button>
        )
      }
    />
  );

  if (f)
    return (
      <>
        {header}
        <form
          onSubmit={save}
          className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2"
        >
          <h2 className="font-semibold sm:col-span-2">
            {f.id ? "Sửa hoạt động" : "Tạo hoạt động mới"}
          </h2>
          <label className="text-xs text-muted-foreground sm:col-span-2">
            Tên hoạt động *
            <input
              required
              minLength={3}
              maxLength={200}
              className={`${inp} mt-1`}
              value={f.title}
              onChange={(e) =>
                setF({ ...f, title: e.target.value, slug: f.id ? f.slug : slugify(e.target.value) })
              }
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Slug (đường dẫn)
            <input
              className={`${inp} mt-1`}
              value={f.slug}
              onChange={(e) => setF({ ...f, slug: e.target.value })}
            />
          </label>
          <div className="text-xs text-muted-foreground">
            Loại hoạt động
            <Select
              value={f.category}
              onValueChange={(v) => setF({ ...f, category: v as ActivityCategory })}
            >
              <SelectTrigger
                aria-label="Loại hoạt động"
                className="mt-1 h-9 w-full rounded-lg border-input bg-background text-sm shadow-none"
              >
                <SelectValue>{CATEGORY_LABEL[f.category]}</SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {CATS.map((k) => (
                  <SelectItem key={k} value={k} className="text-sm">
                    {CATEGORY_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Ảnh banner (JPG/PNG/WebP ≤ 5MB)</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <Upload className="h-4 w-4" />
              {f.banner_path ? "Đổi ảnh" : "Tải ảnh lên"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
            </label>
            {f.banner_path && (
              <span className="ml-2 text-xs text-success">
                Đã có ảnh ·{" "}
                <button
                  type="button"
                  className="text-destructive underline"
                  onClick={() => setF({ ...f, banner_path: "" })}
                >
                  Gỡ
                </button>
              </span>
            )}
          </div>
          <label className="text-xs text-muted-foreground sm:col-span-2">
            Mô tả ngắn
            <input
              maxLength={300}
              className={`${inp} mt-1`}
              value={f.short_description}
              onChange={(e) => setF({ ...f, short_description: e.target.value })}
            />
          </label>
          <label className="text-xs text-muted-foreground sm:col-span-2">
            Mô tả chi tiết
            <textarea
              rows={6}
              maxLength={10000}
              className={`${inp} mt-1`}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Bắt đầu
            <input
              type="datetime-local"
              className={`${inp} mt-1`}
              value={toLocal(f.start_time)}
              onChange={(e) => setF({ ...f, start_time: fromLocal(e.target.value) })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Kết thúc
            <input
              type="datetime-local"
              className={`${inp} mt-1`}
              value={toLocal(f.end_time)}
              onChange={(e) => setF({ ...f, end_time: fromLocal(e.target.value) })}
            />
          </label>
          <div className="text-xs text-muted-foreground">
            Hình thức
            <Select
              value={f.location_type}
              onValueChange={(v) => setF({ ...f, location_type: v as LocationType })}
            >
              <SelectTrigger
                aria-label="Hình thức"
                className="mt-1 h-9 w-full rounded-lg border-input bg-background text-sm shadow-none"
              >
                <SelectValue>{LOCATION_LABEL[f.location_type]}</SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.entries(LOCATION_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-sm">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="text-xs text-muted-foreground">
            Địa điểm / nền tảng
            <input
              maxLength={300}
              className={`${inp} mt-1`}
              placeholder="vd: Google Meet hoặc địa chỉ"
              value={f.location_detail}
              onChange={(e) => setF({ ...f, location_detail: e.target.value })}
            />
          </label>
          <div className="space-y-2 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Hình thức đăng ký</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  [
                    "tml",
                    "Dùng Form có sẵn của TML",
                    "Người tham gia điền form ngay trên website, đơn về mục Đơn đăng ký.",
                  ],
                  [
                    "ext",
                    "Link đăng ký ngoài",
                    "Chuyển tới Google Form… (có thể để trống, bổ sung sau).",
                  ],
                ] as const
              ).map(([k, l, d]) => {
                const on = k === "ext" ? extMode : !extMode;
                return (
                  <button
                    type="button"
                    key={k}
                    onClick={() => {
                      setExtMode(k === "ext");
                      if (k === "tml") setF({ ...f, registration_url: "" });
                    }}
                    className={`rounded-lg border p-3 text-left text-sm ${on ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <span className="font-semibold">{l}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{d}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {extMode && (
            <label className="text-xs text-muted-foreground sm:col-span-2">
              Link đăng ký ngoài (không bắt buộc)
              <input
                className={`${inp} mt-1`}
                placeholder="forms.gle/…"
                value={f.registration_url}
                onChange={(e) => setF({ ...f, registration_url: e.target.value })}
              />
            </label>
          )}
          <label className="text-xs text-muted-foreground">
            Hạn đăng ký (không bắt buộc)
            <input
              type="datetime-local"
              className={`${inp} mt-1`}
              value={toLocal(f.registration_deadline)}
              onChange={(e) => setF({ ...f, registration_deadline: fromLocal(e.target.value) })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Số người tối đa (0 = không giới hạn)
            <input
              type="number"
              min={0}
              className={`${inp} mt-1`}
              value={f.max_participants}
              onChange={(e) =>
                setF({ ...f, max_participants: Math.max(0, Number(e.target.value)) })
              }
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Link Facebook
            <input
              className={`${inp} mt-1`}
              value={f.facebook_url}
              onChange={(e) => setF({ ...f, facebook_url: e.target.value })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Link Website
            <input
              className={`${inp} mt-1`}
              value={f.website_url}
              onChange={(e) => setF({ ...f, website_url: e.target.value })}
            />
          </label>
          {canPublish ? (
            <div className="text-xs text-muted-foreground">
              Trạng thái hiển thị
              <Select
                value={f.manual_status}
                onValueChange={(v) => setF({ ...f, manual_status: v as ManualStatus })}
              >
                <SelectTrigger
                  aria-label="Trạng thái hiển thị"
                  className="mt-1 h-9 w-full rounded-lg border-input bg-background text-sm shadow-none"
                >
                  <SelectValue>{MANUAL_LABEL[f.manual_status]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(MANUAL_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-sm">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Hoạt động được lưu ở dạng Nháp. Trưởng/Phó Ban Truyền thông sẽ duyệt và đăng.
            </p>
          )}
          <p className="self-end text-xs text-muted-foreground">
            Khi "Đã đăng", trạng thái Sắp diễn ra / Đang diễn ra / Đã kết thúc tự tính theo thời
            gian.
          </p>
          {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Đang lưu…" : "Lưu"}
            </button>
            <button
              type="button"
              onClick={() => {
                setF(null);
                setErr("");
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              Hủy
            </button>
          </div>
        </form>
      </>
    );

  return (
    <div className="space-y-3">
      {dialog}
      {header}
      <div
        className={
          onOpenPendingRegs
            ? "grid grid-cols-2 gap-3 lg:grid-cols-4"
            : "grid grid-cols-2 gap-3 lg:grid-cols-3"
        }
      >
        <button
          type="button"
          onClick={() => setTime(time === "upcoming" ? "" : "upcoming")}
          aria-pressed={time === "upcoming"}
          className={`cursor-pointer rounded-2xl border bg-card p-4 text-left shadow-2xs transition-colors hover:border-primary/40 ${
            time === "upcoming" ? "border-primary ring-2 ring-primary/15" : "border-border/70"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Sắp diễn ra</span>
            <CalendarClock className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{upcoming}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Chưa tới giờ bắt đầu</p>
        </button>

        <div className="rounded-2xl border border-border/70 bg-card p-4 text-left shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Đang mở đăng ký</span>
            <Ticket className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{openRegs}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Đã đăng, còn hạn đăng ký</p>
        </div>

        {onOpenPendingRegs && (
          <button
            type="button"
            onClick={() => onOpenPendingRegs()}
            className="cursor-pointer rounded-2xl border border-border/70 bg-card p-4 text-left shadow-2xs transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Đơn chờ duyệt</span>
              <Inbox className="h-4 w-4 text-amber-500" />
            </div>
            <p
              className={`mt-2 text-2xl font-bold tracking-tight ${
                pendingRegs > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              }`}
            >
              {pendingRegs}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Bấm để duyệt</p>
          </button>
        )}

        <button
          type="button"
          onClick={() => setSt(st === "draft" ? "" : "draft")}
          aria-pressed={st === "draft"}
          className={`cursor-pointer rounded-2xl border bg-card p-4 text-left shadow-2xs transition-colors hover:border-primary/40 ${
            st === "draft" ? "border-primary ring-2 ring-primary/15" : "border-border/70"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Bản nháp</span>
            <FilePen className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{drafts}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Chưa đăng lên website</p>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
        <div className="relative col-span-2 sm:min-w-[240px] sm:max-w-xs sm:flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Tìm tên hoặc slug…"
            aria-label="Tìm kiếm hoạt động"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={cat || "all"} onValueChange={(v) => setCat(v === "all" ? "" : v)}>
          <SelectTrigger
            aria-label="Lọc theo loại"
            className="h-9 w-full rounded-xl border-input bg-card text-xs font-normal shadow-xs sm:w-[170px]"
          >
            <SelectValue>{cat ? CATEGORY_LABEL[cat as ActivityCategory] : "Mọi loại"}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Mọi loại
            </SelectItem>
            {CATS.map((k) => (
              <SelectItem key={k} value={k} className="text-xs">
                {CATEGORY_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={st || "all"} onValueChange={(v) => setSt(v === "all" ? "" : v)}>
          <SelectTrigger
            aria-label="Lọc theo hiển thị"
            className="h-9 w-full rounded-xl border-input bg-card text-xs font-normal shadow-xs sm:w-[170px]"
          >
            <SelectValue>
              {st ? ((MANUAL_LABEL as Record<string, string>)[st] ?? st) : "Mọi hiển thị"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Mọi hiển thị
            </SelectItem>
            {Object.entries(MANUAL_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={time || "all"} onValueChange={(v) => setTime(v === "all" ? "" : v)}>
          <SelectTrigger
            aria-label="Lọc theo thời gian"
            className="h-9 w-full rounded-xl border-input bg-card text-xs font-normal shadow-xs sm:w-[170px]"
          >
            <SelectValue>
              {time
                ? (GROUPS.find((g) => g.key === time)?.label ?? "Mọi thời gian")
                : "Mọi thời gian"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Mọi thời gian
            </SelectItem>
            {GROUPS.map((g) => (
              <SelectItem key={g.key} value={g.key} className="text-xs">
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-end gap-3 sm:ml-auto">
          {filtered && (
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer text-xs font-medium text-primary hover:underline"
            >
              Xóa lọc
            </button>
          )}
          <span className="text-xs text-muted-foreground">{rows.length} hoạt động</span>
        </div>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {acts.isLoading && (
        <div className="space-y-2" aria-busy="true" aria-label="Đang tải hoạt động">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[69px] animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      )}
      {!acts.isLoading &&
        rows.length === 0 &&
        (all.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Chưa có hoạt động nào. Bấm <strong className="text-foreground">Tạo hoạt động</strong>{" "}
            trên thanh tiêu đề để thêm workshop, cuộc thi hay sự kiện đầu tiên.
          </p>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            <p>Không có hoạt động khớp bộ lọc.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 cursor-pointer text-xs font-medium text-primary hover:underline"
            >
              Xóa lọc
            </button>
          </div>
        ))}
      <div className="space-y-6">
        {GROUPS.map((g) => {
          const list = rows.filter((a) => groupOf(a, now) === g.key).sort(GROUP_SORT[g.key]);
          if (!list.length) return null;
          return (
            <ActivityGroup
              key={g.key}
              group={g.key}
              label={g.label}
              rows={list}
              open={filtered || openGroups[g.key]}
              onToggle={() => setOpenGroups((o) => ({ ...o, [g.key]: !o[g.key] }))}
              counts={counts.data}
              now={now}
              canPublish={canPublish}
              onEdit={(a) => setF({ ...a })}
              onDuplicate={duplicate}
              onTogglePublish={togglePublish}
              onRemove={remove}
            />
          );
        })}
      </div>
    </div>
  );
}

type Reg = {
  id: string;
  code: string;
  activity_id: string;
  full_name: string;
  email: string;
  phone: string;
  organization: string;
  message: string;
  status: string;
  admin_note: string;
  created_at: string;
};

/** Per-row quick action: pick a status, apply it, then reset so the prompt stays visible. */
function RegStatusPicker({
  options,
  onPick,
}: {
  options: Record<string, string>;
  onPick: (status: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        setValue("");
        onPick(v);
      }}
    >
      <SelectTrigger
        aria-label="Đổi trạng thái đơn"
        className="h-9 w-[150px] rounded-lg border-input bg-background text-xs shadow-none"
      >
        <SelectValue placeholder="Đổi trạng thái…" />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        {Object.entries(options).map(([k, v]) => (
          <SelectItem key={k} value={k} className="text-xs">
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RegsTab({ initialStatus = "" }: { initialStatus?: string }) {
  const qc = useQueryClient();
  const acts = useAllActivities();
  const regs = useAllRegs();
  const [act, setAct] = useState("");
  const [st, setSt] = useState(initialStatus);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const title = (id: string) => acts.data?.find((a) => a.id === id)?.title ?? "—";
  const setStatus = async (r: Reg, status: string) => {
    const note = window.prompt("Ghi chú (tùy chọn):", r.admin_note) ?? r.admin_note;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("activity_registrations")
      .update({
        status,
        admin_note: note,
        reviewed_by: u.user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    if (error) setErr(error.message);
    else qc.invalidateQueries({ queryKey: ["admin-activity-regs"] });
  };
  const term = q.trim().toLowerCase();
  const rows = (regs.data ?? []).filter(
    (r) =>
      (!act || r.activity_id === act) &&
      (!st || r.status === st) &&
      (!term || `${r.full_name} ${r.email} ${r.code} ${r.phone}`.toLowerCase().includes(term)),
  );
  const digits = (p: string) => p.replace(/\D/g, "").replace(/^84/, "0");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={act || "all"} onValueChange={(v) => setAct(v === "all" ? "" : v)}>
          <SelectTrigger
            aria-label="Lọc theo hoạt động"
            className="h-9 w-[220px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>{act ? title(act) : "Tất cả hoạt động"}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Tất cả hoạt động
            </SelectItem>
            {(acts.data ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-xs">
                {a.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={st || "all"} onValueChange={(v) => setSt(v === "all" ? "" : v)}>
          <SelectTrigger
            aria-label="Lọc theo trạng thái đơn"
            className="h-9 w-[170px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>{st ? (REG_STATUS[st] ?? st) : "Mọi trạng thái"}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Mọi trạng thái
            </SelectItem>
            {Object.entries(REG_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Tìm tên, email, mã, SĐT…"
            aria-label="Tìm kiếm đơn đăng ký"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className="self-center text-xs text-muted-foreground">{rows.length} đơn</span>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground">
            <tr>
              {[
                "Mã",
                "Người đăng ký",
                "Hoạt động",
                "Liên hệ",
                "Thời gian",
                "Trạng thái",
                "Thao tác",
              ].map((h) => (
                <th key={h} className="p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="p-3 font-mono text-xs">{r.code}</td>
                <td className="p-3">
                  <p className="font-medium">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">{r.organization}</p>
                  {r.message && (
                    <p className="mt-1 max-w-xs text-xs italic text-muted-foreground">
                      “{r.message}”
                    </p>
                  )}
                </td>
                <td className="p-3 text-xs">{title(r.activity_id)}</td>
                <td className="p-3 text-xs">
                  <p>{r.email}</p>
                  <p>{r.phone}</p>
                  <div className="mt-1 flex gap-1">
                    <a
                      href={`https://zalo.me/${digits(r.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-border px-2 py-0.5 text-primary"
                    >
                      Mở Zalo
                    </a>
                    <a
                      href={`tel:${digits(r.phone)}`}
                      className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5"
                    >
                      <Phone className="h-3 w-3" />
                      Gọi
                    </a>
                  </div>
                </td>
                <td className="p-3 text-xs">{fmtDateTime(r.created_at)}</td>
                <td className="p-3 text-xs">
                  <span className="rounded-full bg-secondary px-2 py-0.5">
                    {REG_STATUS[r.status] ?? r.status}
                  </span>
                  {r.admin_note && <p className="mt-1 text-muted-foreground">{r.admin_note}</p>}
                </td>
                <td className="p-3">
                  <RegStatusPicker
                    options={Object.fromEntries(
                      Object.entries(REG_STATUS).filter(([k]) => k !== r.status),
                    )}
                    onPick={(s) => setStatus(r, s)}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Chưa có đơn đăng ký.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  create: "Tạo hoạt động",
  update: "Cập nhật",
  status: "Đổi trạng thái",
  delete: "Xóa",
  review_registration: "Xử lý đơn đăng ký",
};

function AuditTab() {
  const logs = useQuery({
    queryKey: ["admin-activity-audit"],
    queryFn: async () =>
      (
        await supabase
          .from("activity_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300)
      ).data ?? [],
  });
  const acts = useQuery({
    queryKey: ["admin-activity-titles"],
    queryFn: async () => (await supabase.from("activities").select("id, title")).data ?? [],
  });
  const title = (id: string | null) => acts.data?.find((a) => a.id === id)?.title ?? "—";
  const summary = (l: { action: string; details: unknown }) => {
    const d = (l.details ?? {}) as {
      code?: string;
      before?: Record<string, unknown> | null;
      after?: Record<string, unknown> | null;
      note?: string;
    };
    if (l.action === "review_registration") {
      const before = String(d.before ?? "");
      const after = String(d.after ?? "");
      return `${d.code}: ${REG_STATUS[before] ?? before} → ${REG_STATUS[after] ?? after}${d.note ? ` (${d.note})` : ""}`;
    }
    if (l.action === "status")
      return `${MANUAL_LABEL[d.before?.["manual_status"] as ManualStatus] ?? ""} → ${MANUAL_LABEL[d.after?.["manual_status"] as ManualStatus] ?? ""}`;
    if (l.action === "update" && d.before && d.after) {
      const before = d.before;
      const after = d.after;
      return (
        Object.keys(after)
          .filter(
            (k) => k !== "updated_at" && JSON.stringify(after[k]) !== JSON.stringify(before[k]),
          )
          .join(", ") || "—"
      );
    }
    return "";
  };
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-secondary text-left text-xs text-muted-foreground">
          <tr>
            {["Thời gian", "Người thực hiện", "Hành động", "Hoạt động", "Chi tiết"].map((h) => (
              <th key={h} className="p-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(logs.data ?? []).map((l) => (
            <tr key={l.id} className="border-t border-border">
              <td className="p-3 text-xs">{fmtDateTime(l.created_at)}</td>
              <td className="p-3 text-xs">{l.actor_name || "—"}</td>
              <td className="p-3 text-xs">{ACTION_LABEL[l.action] ?? l.action}</td>
              <td className="p-3 text-xs">{title(l.activity_id)}</td>
              <td className="p-3 text-xs text-muted-foreground">{summary(l)}</td>
            </tr>
          ))}
          {logs.data?.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-muted-foreground">
                Chưa có nhật ký.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
