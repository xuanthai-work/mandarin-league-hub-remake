import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  ArrowUpRight, BookOpen, CalendarPlus, CheckCheck, ChevronRight, ClipboardCheck, GraduationCap,
  Megaphone, UserPlus, Users, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_SECTIONS, ROLE_LABELS } from "@/lib/admin-nav";
import { PERIOD_STATUS, deptName } from "@/lib/recruitment";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/")({ staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Tổng quan | TML Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Overview,
});

// ---------------------------------------------------------------- helpers

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtClock = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return fmtDay(iso);
}

// ---------------------------------------------------------------- data

type ActionKind = "candidate" | "enrollment" | "task";
type ActionItem = { key: string; kind: ActionKind; title: string; meta: string; createdAt: string; section: string };
type UpcomingEvent = { id: string; title: string; start: string; place: string };

type MembersBlock = { active: number; onLeave: number; total: number };
type RecruitmentBlock = {
  latestName: string | null; latestStatus: string | null; open: boolean; appsInLatest: number; pending: number;
  pendingRows: { id: string; full_name: string; created_at: string }[];
};
type CoursesBlock = {
  running: number; pending: number;
  pendingRows: { id: string; full_name: string; level: number; created_at: string }[];
};
type ActivitiesBlock = { thisMonth: number; upcoming: UpcomingEvent[] };
type TasksBlock = {
  awaitingReview: number;
  rows: { id: string; title: string; due_on: string | null; created_at: string }[];
};

type DashboardStats = {
  members: MembersBlock | null;
  recruitment: RecruitmentBlock | null;
  courses: CoursesBlock | null;
  activities: ActivitiesBlock | null;
  tasks: TasksBlock | null;
  actions: ActionItem[];
  totalActions: number;
};

async function loadMembers(): Promise<MembersBlock | null> {
  const { data, error } = await supabase.from("members").select("status");
  if (error) return null;
  const rows = data ?? [];
  return {
    total: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    onLeave: rows.filter((r) => r.status === "on_leave").length,
  };
}

async function loadRecruitment(): Promise<RecruitmentBlock | null> {
  const [periods, applications] = await Promise.all([
    supabase.from("recruitment_periods").select("id, name, status, starts_on").order("starts_on", { ascending: false }),
    supabase.from("candidate_applications").select("id, full_name, status, created_at, period_id").order("created_at", { ascending: false }).limit(300),
  ]);
  if (periods.error && applications.error) return null;
  const latest = (periods.data ?? [])[0];
  const apps = applications.data ?? [];
  const pendingRows = apps.filter((a) => a.status === "submitted");
  return {
    latestName: latest?.name ?? null,
    latestStatus: latest ? PERIOD_STATUS[latest.status] ?? latest.status : null,
    open: (periods.data ?? []).some((p) => p.status === "open"),
    appsInLatest: latest ? apps.filter((a) => a.period_id === latest.id).length : 0,
    pending: pendingRows.length,
    pendingRows: pendingRows.slice(0, 4),
  };
}

async function loadCourses(): Promise<CoursesBlock | null> {
  const [courses, enrollments] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }).in("status", ["enrolling", "upcoming", "ongoing"]).is("deleted_at", null),
    supabase.from("course_enrollments").select("id, full_name, level, created_at", { count: "exact" }).eq("status", "pending").order("created_at", { ascending: false }).limit(4),
  ]);
  if (courses.error && enrollments.error) return null;
  return {
    running: courses.count ?? 0,
    pending: enrollments.count ?? 0,
    pendingRows: enrollments.data ?? [],
  };
}

async function loadActivities(now: Date): Promise<ActivitiesBlock | null> {
  const { data, error } = await supabase.from("activities")
    .select("id, title, start_time, location_detail")
    .eq("manual_status", "published").is("deleted_at", null)
    .gte("start_time", now.toISOString())
    .order("start_time", { ascending: true }).limit(40);
  if (error) return null;
  const upcoming: UpcomingEvent[] = (data ?? []).flatMap((a) =>
    a.start_time ? [{ id: a.id, title: a.title, start: a.start_time, place: a.location_detail }] : []);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return {
    thisMonth: upcoming.filter((a) => new Date(a.start).getTime() < monthEnd).length,
    upcoming: upcoming.slice(0, 3),
  };
}

async function loadTasks(): Promise<TasksBlock | null> {
  const { data, count, error } = await supabase.from("tasks")
    .select("id, title, due_on, created_at", { count: "exact" })
    .eq("status", "submitted").order("created_at", { ascending: false }).limit(4);
  if (error) return null;
  return { awaitingReview: count ?? 0, rows: data ?? [] };
}

async function loadDashboardStats(allowed: string[] | "all"): Promise<DashboardStats> {
  const can = (slug: string) => allowed === "all" || allowed.includes(slug);
  const now = new Date();
  const [members, recruitment, courses, activities, tasks] = await Promise.all([
    can("members") ? loadMembers() : Promise.resolve(null),
    can("candidates") || can("recruitment") ? loadRecruitment() : Promise.resolve(null),
    can("courses") ? loadCourses() : Promise.resolve(null),
    can("activities") ? loadActivities(now) : Promise.resolve(null),
    can("tasks") ? loadTasks() : Promise.resolve(null),
  ]);

  const actions: ActionItem[] = [];
  for (const a of recruitment?.pendingRows ?? []) {
    actions.push({ key: `c-${a.id}`, kind: "candidate", title: a.full_name, meta: `Hồ sơ ứng tuyển · ${timeAgo(a.created_at)}`, createdAt: a.created_at, section: "candidates" });
  }
  for (const e of courses?.pendingRows ?? []) {
    actions.push({ key: `e-${e.id}`, kind: "enrollment", title: e.full_name, meta: `Đăng ký HSK ${e.level} · ${timeAgo(e.created_at)}`, createdAt: e.created_at, section: "courses" });
  }
  for (const t of tasks?.rows ?? []) {
    actions.push({ key: `t-${t.id}`, kind: "task", title: t.title, meta: t.due_on ? `Báo cáo chờ duyệt · hạn ${fmtDay(t.due_on)}` : "Báo cáo chờ duyệt · chưa đặt hạn", createdAt: t.created_at, section: "tasks" });
  }

  return {
    members, recruitment, courses, activities, tasks,
    actions: actions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    totalActions: (recruitment?.pending ?? 0) + (courses?.pending ?? 0) + (tasks?.awaitingReview ?? 0),
  };
}

// ---------------------------------------------------------------- presentation

const QUICK_ACTIONS: { section: string; label: string; icon: LucideIcon }[] = [
  { section: "recruitment", label: "Đợt tuyển mới", icon: Megaphone },
  { section: "members", label: "Thêm thành viên", icon: UserPlus },
  { section: "courses", label: "Tạo khóa học", icon: BookOpen },
  { section: "activities", label: "Đăng hoạt động", icon: CalendarPlus },
];

const ACTION_LOOK: Record<ActionKind, { icon: LucideIcon; tone: string; label: string }> = {
  candidate: { icon: UserPlus, tone: "bg-primary/10 text-primary", label: "Hồ sơ" },
  enrollment: { icon: GraduationCap, tone: "bg-gold/15 text-[color:var(--metal-gold-lo)] dark:text-gold", label: "Đăng ký" },
  task: { icon: ClipboardCheck, tone: "bg-success/12 text-success", label: "Nhiệm vụ" },
};

function StatCard({ section, icon: Icon, label, value, unit, badge, badgeClass, hint, loading }: {
  section: string;
  icon: LucideIcon;
  label: string;
  value: number | null;
  unit: string;
  badge: string | null;
  badgeClass: string;
  hint: string | null;
  loading: boolean;
}) {
  return (
    <Link
      to="/admin/$section"
      params={{ section }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:hover:translate-y-0"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-gold/70 via-gold/25 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <ArrowUpRight aria-hidden className="h-4 w-4 text-muted-foreground/30 transition group-hover:text-primary" />
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        {loading ? <Skeleton className="h-8 w-14" /> : (
          <span className="font-mono text-3xl font-semibold tabular-nums leading-none tracking-tight">{value ?? "—"}</span>
        )}
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>{badge}</span>}
        {hint && <span className="truncate text-muted-foreground">{hint}</span>}
        {!badge && !hint && !loading && <span className="text-muted-foreground">Chưa có dữ liệu</span>}
      </div>
    </Link>
  );
}

function ActionRow({ item }: { item: ActionItem }) {
  const look = ACTION_LOOK[item.kind];
  return (
    <Link
      to="/admin/$section"
      params={{ section: item.section }}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${look.tone}`}>
        <look.icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
      </div>
      <span className="hidden rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning-foreground sm:inline">{look.label}</span>
      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Panel({ title, meta, children }: { title: string; meta: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {meta}
      </div>
      {children}
    </section>
  );
}

function Overview() {
  const access = useAdminAccess();
  const allowed = access.data?.allowed;
  const stats = useQuery({
    queryKey: ["admin-dashboard", allowed ?? []],
    enabled: !!allowed,
    queryFn: () => loadDashboardStats(allowed ?? []),
    staleTime: 60_000,
  });

  const can = (slug: string) => allowed === "all" || (allowed ?? []).includes(slug);
  const data = stats.data;
  const loading = !data;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const fullName = (access.data?.name ?? "").trim();
  const name = fullName || (access.data?.email ?? "").split("@")[0] || "bạn";
  const role = access.data?.roles[0];
  const department = access.data?.department;
  const dateLabel = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(now);

  const quickActions = QUICK_ACTIONS.filter((a) => can(a.section));
  const shortcuts = ADMIN_SECTIONS
    .filter((s) => can(s.slug) && !QUICK_ACTIONS.some((q) => q.section === s.slug))
    .slice(0, 6);

  const upcoming = data?.activities?.upcoming ?? [];
  const nextEvent = upcoming[0] ?? null;
  const actions = data?.actions ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Greeting + quick actions */}
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-500 motion-reduce:animate-none">
          <h1 className="text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl">
            {greeting}, {name}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{dateLabel}</span>
            {role && <><span aria-hidden className="text-border">·</span><span className="font-medium text-foreground/80">{ROLE_LABELS[role]}</span></>}
            {department && <><span aria-hidden className="text-border">·</span><span>{deptName(department)}</span></>}
          </p>
        </div>
        {quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-in fade-in duration-500 [animation-delay:120ms] fill-mode-both motion-reduce:animate-none">
            {quickActions.map((a) => (
              <Link
                key={a.section}
                to="/admin/$section"
                params={{ section: a.section }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <a.icon aria-hidden className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                {a.label}
              </Link>
            ))}
          </div>
        )}
      </header>
      <div aria-hidden className="mt-5 h-px bg-gradient-to-r from-border via-border/60 to-transparent" />

      {/* Live metrics */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can("members") && (
          <StatCard section="members" icon={Users} label="Thành viên" loading={loading}
            value={data?.members?.active ?? null} unit="đang hoạt động"
            badge={data?.members ? `${data.members.onLeave} tạm nghỉ` : null}
            badgeClass="bg-warning-soft text-warning-foreground"
            hint={data?.members ? `${data.members.total} hồ sơ đã lập` : loading ? null : "Không tải được số liệu"} />
        )}
        {(can("candidates") || can("recruitment")) && (
          <StatCard section="candidates" icon={UserPlus} label="Tuyển dụng" loading={loading}
            value={data?.recruitment?.appsInLatest ?? null} unit="hồ sơ trong đợt"
            badge={data?.recruitment ? (data.recruitment.open ? "Đợt đang mở" : data.recruitment.latestStatus ?? "Chưa có đợt") : null}
            badgeClass={data?.recruitment?.open ? "bg-success/15 text-success" : "bg-secondary text-secondary-foreground"}
            hint={data?.recruitment ? (data.recruitment.pending > 0 ? `${data.recruitment.pending} hồ sơ chờ duyệt` : data.recruitment.latestName) : loading ? null : "Không tải được số liệu"} />
        )}
        {can("courses") && (
          <StatCard section="courses" icon={BookOpen} label="Học vụ & Đào tạo" loading={loading}
            value={data?.courses?.running ?? null} unit="khóa đang chạy"
            badge={data?.courses ? (data.courses.pending > 0 ? `${data.courses.pending} chờ duyệt` : "Đã duyệt hết") : null}
            badgeClass={data?.courses?.pending ? "bg-warning-soft text-warning-foreground" : "bg-success/15 text-success"}
            hint={data?.courses ? "Đăng ký học viên" : loading ? null : "Không tải được số liệu"} />
        )}
        {can("activities") && (
          <StatCard section="activities" icon={CalendarPlus} label="Hoạt động & Sự kiện" loading={loading}
            value={data?.activities?.thisMonth ?? null} unit="sự kiện tháng này"
            badge={nextEvent ? fmtDay(nextEvent.start) : null}
            badgeClass="bg-primary/10 text-primary"
            hint={data?.activities ? (nextEvent ? "Sự kiện gần nhất" : "Chưa có lịch sắp tới") : loading ? null : "Không tải được số liệu"} />
        )}
        {!can("members") && !can("courses") && !can("activities") && !can("candidates") && !can("recruitment") && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground sm:col-span-2 xl:col-span-4">
            Tài khoản của bạn chưa được cấp quyền xem số liệu tổng hợp. Dùng thanh điều hướng để mở các chuyên mục được giao.
          </div>
        )}
      </div>

      {/* Action centre + right rail */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Panel
          title="Cần xử lý"
          meta={data ? (
            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${data.totalActions > 0 ? "bg-warning-soft text-warning-foreground" : "bg-success/15 text-success"}`}>
              {data.totalActions > 0 ? `${data.totalActions} mục` : "Đã xong"}
            </span>
          ) : null}
        >
          {loading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-2/5" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : actions.length > 0 ? (
            <div className="space-y-0.5 p-2">{actions.map((item) => <ActionRow key={item.key} item={item} />)}</div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-success/12 text-success"><CheckCheck className="h-5 w-5" /></span>
              <p className="mt-1 text-sm font-medium text-foreground">Mọi công việc đã được xử lý hoàn tất</p>
              <p className="text-xs text-muted-foreground">Hồ sơ ứng tuyển, đăng ký khóa học và báo cáo nhiệm vụ đều đã được duyệt.</p>
            </div>
          )}
        </Panel>

        <div className="grid gap-5 content-start">
          {can("activities") && (
            <Panel
              title="Sự kiện sắp tới"
              meta={<Link to="/admin/$section" params={{ section: "activities" }} className="text-xs font-semibold text-primary hover:underline">Quản lý</Link>}
            >
              {loading ? (
                <div className="space-y-3 p-5">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : upcoming.length > 0 ? (
                <ul className="divide-y divide-border/60">
                  {upcoming.map((e) => (
                    <li key={e.id}>
                      <Link to="/admin/$section" params={{ section: "activities" }} className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-accent/40">
                        <span className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-border/70 bg-muted/40 py-1">
                          <span className="font-mono text-base font-semibold leading-none tabular-nums">{new Date(e.start).getDate()}</span>
                          <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">thg {new Date(e.start).getMonth() + 1}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{e.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {fmtClock(e.start)}{e.place ? ` · ${e.place}` : ""}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-8 text-center text-xs text-muted-foreground">Chưa có hoạt động nào được lên lịch.</p>
              )}
            </Panel>
          )}

          {shortcuts.length > 0 && (
            <Panel title="Lối tắt nghiệp vụ" meta={<span className="text-xs text-muted-foreground">Theo quyền của bạn</span>}>
              <div className="flex flex-wrap gap-2 p-4">
                {shortcuts.map((s) => (
                  <Link
                    key={s.slug}
                    to="/admin/$section"
                    params={{ section: s.slug }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <s.icon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {s.label}
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
