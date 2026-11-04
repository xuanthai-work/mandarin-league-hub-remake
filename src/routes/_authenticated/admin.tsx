import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  LogOut,
  Menu,
  X,
  ShieldAlert,
  IdCard,
  ChevronDown,
  Home,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ADMIN_SECTIONS, OVERVIEW_ICON, ROLE_LABELS, ROLE_PRIORITY, navGroupsFor, type AdminNavGroup,
} from "@/lib/admin-nav";
import { allowedSections } from "@/lib/admin-permissions";
import { AdminHeaderProvider } from "@/components/admin/AdminHeaderProvider";
import { useAdminHeader } from "@/components/admin/admin-header-context";

/** Renders the current page's header actions as capsules that mirror the breadcrumb capsule. */
function HeaderActions() {
  const header = useAdminHeader();
  if (!header?.headerActions) return null;
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2 [&_button]:inline-flex [&_button]:items-center [&_button]:gap-2 [&_button]:rounded-xl [&_button]:border [&_button]:border-primary/25 [&_button]:bg-primary [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-xs [&_button]:font-semibold [&_button]:tracking-tight [&_button]:text-primary-foreground [&_button]:shadow-2xs [&_button]:transition-all [&_button]:hover:opacity-90 [&_button]:sm:gap-2.5 [&_button]:sm:px-3.5 [&_button]:sm:py-2 [&_button]:sm:text-sm [&_svg]:h-3.5 [&_svg]:w-3.5">
      {header.headerActions}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/admin")({ staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Quản trị | The Mandarin League" },
      { name: "description", content: "Khu vực quản trị nội bộ của The Mandarin League." },
      { property: "og:title", content: "Quản trị – TML" },
      { property: "og:description", content: "Khu vực quản trị nội bộ TML." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

export function useAdminAccess() {
  return useQuery({
    queryKey: ["admin-access"],
    queryFn: async () => {
      const { data } = await supabase.rpc("my_account");
      const me = data as unknown as { email: string; roles: string[]; account: { account_status: string; must_change_password: boolean; permissions?: string[] } | null; member: { department: string; full_name: string } | null };
      const blocked = !!me.account && me.account.account_status !== "active";
      const roles = blocked ? [] : ROLE_PRIORITY.filter((r) => me.roles.includes(r));
      const department = blocked ? null : me.member?.department ?? null;
      const permissions = blocked ? [] : me.account?.permissions ?? [];
      const allowed = allowedSections(roles, department, permissions);
      return { email: me.email ?? "", name: blocked ? "" : me.member?.full_name ?? "", roles, department, allowed, permissions, hasAccount: !!me.account, mustChange: !!me.account?.must_change_password };
    },
  });
}

const NAV_ITEM =
  "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-150 hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
const NAV_ACTIVE =
  "border border-border/80 bg-background font-semibold text-foreground shadow-2xs [&_svg]:text-primary";
const ICON_BTN =
  "grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/** Groups the user collapsed stay collapsed across reloads; the active group always opens. */
const COLLAPSE_KEY = "tml_admin_collapsed_groups";

function readCollapsedGroups(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(COLLAPSE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "boolean") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function SidebarPanel({ email, name, roleLabel, groups, currentSlug, collapsed, onToggleGroup, onNavigate, onSignOut, onClose }: {
  email: string;
  name: string;
  roleLabel: string;
  groups: AdminNavGroup[];
  currentSlug: string;
  collapsed: Record<string, boolean>;
  onToggleGroup: (title: string) => void;
  onNavigate: () => void;
  onSignOut: () => void;
  onClose?: () => void;
}) {
  const initials = (email.split("@")[0] ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "TML";
  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="relative flex h-[73px] shrink-0 items-center gap-3 border-b border-border/60 px-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/40 bg-gradient-to-b from-card to-background p-1 shadow-[0_4px_14px_-4px_rgba(217,160,44,0.25)]">
          <img src="/logo.svg" alt="" className="h-8 w-8 rounded-full object-cover" />
        </span>
        <div className="min-w-0">
          <p className="font-han truncate text-[13px] font-semibold leading-tight tracking-tight text-foreground">The Mandarin League</p>
          <span className="mt-1 inline-block rounded-md border border-gold/30 bg-gold/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-[color:var(--metal-gold-lo)] shadow-2xs dark:text-gold">
            Admin Portal
          </span>
        </div>
        {onClose && (
          <button aria-label="Đóng menu" onClick={onClose} className={`${ICON_BTN} ml-auto`}>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav aria-label="Điều hướng quản trị" className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pl-3 pr-2 pb-4">
        <div className="px-1 pt-2">
          <Link
            to="/admin"
            activeOptions={{ exact: true }}
            className={NAV_ITEM}
            activeProps={{ className: NAV_ACTIVE, "aria-current": "page" }}
            onClick={onNavigate}
          >
            <OVERVIEW_ICON className="h-4 w-4 shrink-0" strokeWidth={1.75} /> Tổng quan
          </Link>
        </div>
        {groups.map((g) => {
          const key = g.title ?? "group";
          const active = !!currentSlug && g.sections.some((s) => s.slug === currentSlug);
          const isCollapsed = !active && !!collapsed[key];
          const panelId = `nav-group-${g.sections[0]?.slug ?? key}`;
          return (
            <div key={key}>
              {g.title && (
                <button
                  type="button"
                  onClick={() => onToggleGroup(key)}
                  aria-expanded={!isCollapsed}
                  aria-controls={panelId}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 pt-5 pb-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <span>{g.title}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isCollapsed ? "-rotate-90 text-muted-foreground/60" : "rotate-0 text-muted-foreground"}`}
                  />
                </button>
              )}
              <div
                id={panelId}
                className={`grid transition-[grid-template-rows] duration-200 ${isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}
              >
                <div className="overflow-hidden">
                  {/* p-1 keeps the rounded-xl border and shadow clear of the clipping edge. */}
                  <div className="space-y-0.5 p-1" inert={isCollapsed || undefined}>
                    {g.sections.map((s) => (
                      <Link
                        key={s.slug}
                        to="/admin/$section"
                        params={{ section: s.slug }}
                        className={NAV_ITEM}
                        activeProps={{ className: NAV_ACTIVE, "aria-current": "page" }}
                        onClick={onNavigate}
                      >
                        <s.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{s.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border/60 bg-muted/10 p-3">
        <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-2.5 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.05)] transition-all hover:border-border hover:shadow-md">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-[11px] font-bold text-primary ring-1 ring-primary/25 shadow-2xs">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">{name || email}</p>
            <p className="truncate text-[10px] text-muted-foreground">{name ? email : "Chưa có email"}</p>
            <span className="mt-1 inline-block rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-deep dark:text-gold">
              {roleLabel}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link to="/member/dashboard" onClick={onNavigate} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Thẻ thành viên" title="Thẻ thành viên">
              <IdCard className="h-4 w-4" />
            </Link>
            <button onClick={onSignOut} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" aria-label="Đăng xuất" title="Đăng xuất">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminLayout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const access = useAdminAccess();
  const [open, setOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(readCollapsedGroups);
  const toggleGroup = (title: string) => setCollapsedGroups((prev) => {
    const next = { ...prev, [title]: !prev[title] };
    try { window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch { /* storage unavailable: keep the in-memory state */ }
    return next;
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const allowed = access.data?.allowed ?? [];
  const hasAny = allowed === "all" || allowed.length > 0;

  useEffect(() => {
    const d = access.data;
    if (!d) return;
    if (d.mustChange) navigate({ to: "/change-password", replace: true });
    else if (d.hasAccount && !hasAny) navigate({ to: "/member/dashboard", replace: true });
  }, [access.data, hasAny, navigate]);

  // Close the drawer on navigation; Escape closes it; body scroll stays locked while open.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  if (access.isLoading) return <p className="p-16 text-center text-muted-foreground">Đang kiểm tra quyền truy cập…</p>;

  const roles = access.data?.roles ?? [];
  const roleLabel = roles[0] ? ROLE_LABELS[roles[0]] : "Thành viên";
  const groups = navGroupsFor(allowed);
  const current = pathname.replace(/^\/admin\/?/, "").split("/")[0] ?? "";
  const blockedHere = !!current && allowed !== "all" && !allowed.includes(current);
  const title = ADMIN_SECTIONS.find((s) => s.slug === current)?.label ?? "Tổng quan";

  if (!hasAny) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">Tài khoản chưa được cấp quyền</h1>
        <p className="mt-2 text-sm text-muted-foreground">Vui lòng liên hệ Ban Công nghệ & Hệ thống để được phân quyền.</p>
        <button onClick={signOut} className="mt-6 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">Đăng xuất</button>
      </div>
    );
  }

  const email = access.data?.email ?? "";
  const name = access.data?.name ?? "";

  return (
    <AdminHeaderProvider>
      {/* Ambient canvas behind the floating islands; mobile stays edge-to-edge. */}
      <div className="fixed inset-0 z-50 admin-shell text-foreground">
        <div className="flex h-full min-h-0 overflow-hidden bg-muted/30 p-0 dark:bg-zinc-950 lg:gap-3 lg:p-3">
          <aside className="hidden w-[272px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs transition-shadow hover:shadow-sm lg:flex">
            <SidebarPanel
              email={email}
              name={name}
              roleLabel={roleLabel}
              groups={groups}
              currentSlug={current}
              collapsed={collapsedGroups}
              onToggleGroup={toggleGroup}
              onNavigate={() => setOpen(false)}
              onSignOut={signOut}
            />
          </aside>

          {open && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 animate-in fade-in bg-foreground/40 backdrop-blur-sm duration-200" onClick={() => setOpen(false)} />
              <aside
                role="dialog"
                aria-modal="true"
                aria-label="Điều hướng quản trị"
                className="absolute inset-y-0 left-0 w-[288px] animate-in slide-in-from-left shadow-2xl duration-200"
              >
                <SidebarPanel
                  email={email}
                  name={name}
                  roleLabel={roleLabel}
                  groups={groups}
                  currentSlug={current}
                  collapsed={collapsedGroups}
                  onToggleGroup={toggleGroup}
                  onNavigate={() => setOpen(false)}
                  onSignOut={signOut}
                  onClose={() => setOpen(false)}
                />
              </aside>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <main className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden">
              {/* Header: inside <main> so it shares the exact scrollable width with the page content. */}
              <header className="sticky top-0 z-30 w-full px-0 pt-1 pb-1 backdrop-blur-xs sm:pt-2 sm:pb-1.5">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    <button
                      aria-label="Mở menu"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground shadow-2xs transition-colors hover:bg-accent hover:text-foreground lg:hidden"
                      onClick={() => setOpen(true)}
                    >
                      <Menu className="h-5 w-5" />
                    </button>

                    {/* Breadcrumb capsule: [ home > current section ] */}
                    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-card px-2.5 py-1.5 shadow-2xs backdrop-blur-sm sm:gap-2.5 sm:px-3 sm:py-2">
                      <Link
                        to="/admin"
                        aria-label="Về trang tổng quan"
                        title="Trang tổng quan"
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground shadow-2xs transition-colors hover:border-border hover:bg-background hover:text-foreground"
                      >
                        <Home className="h-3.5 w-3.5" />
                      </Link>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                      <span className="truncate text-xs font-semibold tracking-tight text-foreground sm:text-sm">
                        {title}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <HeaderActions />
                  </div>
                </div>
              </header>

              {blockedHere ? (
                <div className="mx-auto max-w-md px-4 py-20 text-center">
                  <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
                  <h1 className="mt-4 text-xl font-bold">Bạn chưa được cấp quyền cho mục này</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Chỉ các mục hiển thị ở thanh bên trái thuộc phạm vi quyền của bạn.</p>
                </div>
              ) : <Outlet />}
            </main>
          </div>
        </div>
      </div>
    </AdminHeaderProvider>
  );
}
