import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Menu, X, ShieldAlert, IdCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_SECTIONS, OVERVIEW_ICON, ROLE_LABELS, ROLE_PRIORITY } from "@/lib/admin-nav";
import { allowedSections } from "@/lib/admin-permissions";

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
      const me = data as unknown as { email: string; roles: string[]; account: { account_status: string; must_change_password: boolean } | null; member: { department: string } | null };
      const blocked = !!me.account && me.account.account_status !== "active";
      const roles = blocked ? [] : ROLE_PRIORITY.filter((r) => me.roles.includes(r));
      const department = blocked ? null : me.member?.department ?? null;
      const allowed = allowedSections(roles, department);
      return { email: me.email ?? "", roles, department, allowed, hasAccount: !!me.account, mustChange: !!me.account?.must_change_password };
    },
  });
}

function AdminLayout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const access = useAdminAccess();
  const [open, setOpen] = useState(false);
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

  if (access.isLoading) {
    return <div className="admin-shell flex min-h-screen items-center justify-center bg-background"><p className="text-sm text-muted-foreground">Đang kiểm tra quyền truy cập…</p></div>;
  }

  const roles = access.data?.roles ?? [];
  const sections = allowed === "all" ? ADMIN_SECTIONS : ADMIN_SECTIONS.filter((s) => allowed.includes(s.slug));
  const current = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  const blockedHere = !!current && allowed !== "all" && !allowed.includes(current);
  if (!hasAny) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-xl font-bold text-foreground">Tài khoản chưa được cấp quyền</h1>
          <p className="mt-2 text-sm text-muted-foreground">Vui lòng liên hệ Ban Công nghệ &amp; Hệ thống để được phân quyền.</p>
          <button onClick={signOut} className="mt-6 rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:bg-primary-deep">Đăng xuất</button>
        </div>
      </div>
    );
  }

  const link = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-primary data-[status=active]:bg-primary/10 data-[status=active]:font-semibold data-[status=active]:text-primary data-[status=active]:ring-1 data-[status=active]:ring-primary/20";

  const nav = (
    <nav className="space-y-1 p-3">
      <Link to="/admin" activeOptions={{ exact: true }} className={link} onClick={() => setOpen(false)}>
        <OVERVIEW_ICON className="h-4 w-4 shrink-0" /> Tổng quan
      </Link>
      {sections.map((s) => (
        <Link key={s.slug} to="/admin/$section" params={{ section: s.slug }} className={link} onClick={() => setOpen(false)}>
          <s.icon className="h-4 w-4 shrink-0" /> {s.label}
        </Link>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex min-w-0 items-center gap-3">
      <img src="/logo.svg" alt="TML" className="h-9 w-9 shrink-0 rounded-full border border-border bg-card object-cover" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold tracking-tight text-primary-deep">The Mandarin League</p>
        <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Admin Portal</span>
      </div>
    </div>
  );

  return (
    <div className="admin-shell fixed inset-0 z-50 flex bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-card lg:block">
        <div className="border-b border-border/70 px-4 py-4">{brand}</div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-border bg-card shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-4">
              {brand}
              <button aria-label="Đóng menu" onClick={() => setOpen(false)} className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3.5 shadow-xs lg:px-6">
          <button aria-label="Mở menu" className="rounded-lg p-1 text-primary-deep hover:bg-accent lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/member/dashboard" className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-card px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent">
              <IdCard className="h-4 w-4" /><span className="hidden sm:inline">Thẻ thành viên của tôi</span>
            </Link>
            <div className="text-right">
              <p className="max-w-[180px] truncate text-sm font-semibold text-foreground">{access.data?.email}</p>
              <p className="mt-0.5 inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{ROLE_LABELS[roles[0]!]}</p>
            </div>
            <button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background">
          {blockedHere ? (
            <div className="mx-auto max-w-md px-4 py-20 text-center">
              <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="mt-4 text-xl font-bold text-foreground">Bạn chưa được cấp quyền cho mục này</h1>
              <p className="mt-2 text-sm text-muted-foreground">Chỉ các mục hiển thị ở thanh bên trái thuộc phạm vi quyền của bạn.</p>
            </div>
          ) : <Outlet />}
        </main>
      </div>
    </div>
  );
}
