import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Menu, X, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/tml-logo.png.asset.json";
import { ADMIN_SECTIONS, OVERVIEW_ICON, ROLE_LABELS, ROLE_PRIORITY, type AdminRole } from "@/lib/admin-nav";

export const Route = createFileRoute("/_authenticated/admin")({
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
      const me = data as unknown as { email: string; roles: string[]; account: { account_status: string; must_change_password: boolean } | null };
      const blocked = !!me.account && me.account.account_status !== "active";
      const roles = blocked ? [] : ROLE_PRIORITY.filter((r) => me.roles.includes(r));
      return { email: me.email ?? "", roles, hasAccount: !!me.account, mustChange: !!me.account?.must_change_password };
    },
  });
}

function AdminLayout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const access = useAdminAccess();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  useEffect(() => {
    const d = access.data;
    if (!d) return;
    if (d.mustChange) navigate({ to: "/change-password", replace: true });
    else if (d.hasAccount && !d.roles.includes("admin") && !d.roles.includes("department_head")) navigate({ to: "/member/dashboard", replace: true });
  }, [access.data, navigate]);

  if (access.isLoading) return <p className="p-16 text-center text-muted-foreground">Đang kiểm tra quyền truy cập…</p>;

  const roles = access.data?.roles ?? [];
  const isAdmin = roles.includes("admin");
  const sections = isAdmin ? ADMIN_SECTIONS : ADMIN_SECTIONS.filter((s) => ["members", "tasks", "contributions"].includes(s.slug));
  if (!isAdmin && !roles.includes("department_head")) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">Tài khoản chưa được cấp quyền</h1>
        <p className="mt-2 text-sm text-muted-foreground">Vui lòng liên hệ Ban Công nghệ & Hệ thống để được phân quyền.</p>
        <button onClick={signOut} className="mt-6 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">Đăng xuất</button>
      </div>
    );
  }

  const link = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground";
  const active = { className: "bg-primary/10 font-semibold text-primary" };

  const nav = (
    <nav className="space-y-1 p-3">
      <Link to="/admin" activeOptions={{ exact: true }} className={link} activeProps={active} onClick={() => setOpen(false)}>
        <OVERVIEW_ICON className="h-4 w-4" /> Tổng quan
      </Link>
      {sections.map((s) => (
        <Link key={s.slug} to="/admin/$section" params={{ section: s.slug }} className={link} activeProps={active} onClick={() => setOpen(false)}>
          <s.icon className="h-4 w-4" /> {s.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-muted/40">
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-card lg:block">
        <div className="portal-ai flex items-center gap-2 px-4 py-4">
          <img src={logo.url} alt="TML" className="h-9 w-9 object-contain" />
          <span className="portal-ink font-bold">TML Admin</span>
        </div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="font-bold text-primary-deep">TML Admin</span>
              <button aria-label="Đóng menu" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="portal-ai portal-ink flex items-center justify-between gap-3 px-4 py-3">
          <button aria-label="Mở menu" className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="max-w-[180px] truncate text-sm font-medium">{access.data?.email}</p>
              <p className="text-xs text-gold">{ROLE_LABELS[roles[0]!]}</p>
            </div>
            <button onClick={signOut} className="inline-flex items-center gap-1 rounded-lg border border-gold/40 px-3 py-2 text-sm hover:bg-primary/20">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}
