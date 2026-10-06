import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/SiteLayout";
import { PersonSlot } from "@/components/site/ui";
import { getDepartments } from "@/lib/data/departments";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/organization")({
  head: () => ({ meta: pageMeta("Cơ cấu tổ chức", "Sơ đồ tổ chức TML: Ban Điều hành và 8 Ban chuyên môn.") }),
  component: POrganization,
});

function POrganization() {
  const deps = getDepartments();
  return (
    <>
      <PageHero eyebrow="Cơ cấu tổ chức" title="Sơ đồ tổ chức TML" desc="The Mandarin League vận hành bởi Ban Điều hành và 8 Ban chuyên môn." />
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="flex flex-col items-center">
          <div className="rounded-xl bg-brand-gradient px-8 py-3 text-center font-bold text-primary-foreground shadow-lg">THE MANDARIN LEAGUE</div>
          <div className="h-8 w-px bg-primary/40" />
          <div className="rounded-xl border-2 border-primary bg-card px-8 py-3 font-semibold text-primary-deep">BAN ĐIỀU HÀNH</div>
          <div className="h-8 w-px bg-primary/40" />
          <div className="hidden w-11/12 border-t border-primary/40 md:block" />
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {deps.map((d, i) => (
            <article key={d.id} className="flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-soft text-sm font-bold text-warning-foreground">{i + 1}</div>
              <h3 className="mt-4 font-bold text-primary-deep">{d.name}</h3>
              <div className="text-xs font-medium uppercase tracking-wide text-primary">{d.nameEn}</div>
              <p className="mt-3 text-sm text-muted-foreground">{d.description}</p>
              {d.responsibilities && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {d.responsibilities.map((r) => <span key={r} className="rounded-md bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">{r}</span>)}
                </div>
              )}
              <div className="mt-5 space-y-3 border-t border-border pt-4">
                <PersonSlot role="Trưởng ban" name={d.lead?.name} />
                <PersonSlot role="Phó ban" name={d.deputy?.name} />
                <div className="text-xs text-muted-foreground">Thành viên: {d.members.length ? d.members.length : "Đang cập nhật"}</div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
