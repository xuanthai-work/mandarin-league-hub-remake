import { createFileRoute, Link } from "@tanstack/react-router";
import { ADMIN_SECTIONS, ROLE_LABELS } from "@/lib/admin-nav";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

function Overview() {
  const access = useAdminAccess();
  const role = access.data?.roles[0];
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-primary-deep">Tổng quan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Xin chào {access.data?.email}{role ? ` · ${ROLE_LABELS[role]}` : ""}
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_SECTIONS.map((s) => (
          <Link key={s.slug} to="/admin/$section" params={{ section: s.slug }}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary">
            <s.icon className="h-5 w-5 text-primary" />
            <span className="font-medium">{s.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
