import { useTr } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/site/SiteLayout";
import { PersonSlot } from "@/components/site/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { getDepartments } from "@/lib/data/departments";
import type { Department } from "@/lib/data/types";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/organization")({ staticData: { sitemap: true },
  head: () => ({ meta: pageMeta("Cơ cấu tổ chức", "Sơ đồ tổ chức TML: Ban Điều hành và 8 Ban chuyên môn.") }),
  component: POrganization,
});

type OrgRow = { dept: string; role_title: string | null; display_name: string | null; member_count: number };
type Path = { id: string; d: string };

const initials = (n?: string) => (n ? n.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase() : "");

function POrganization() {
  const tr = useTr();
  const deps = getDepartments();
  const { data: org, isLoading } = useQuery({ queryKey: ["public-org"], queryFn: async () => ((await supabase.rpc("public_org_chart")).data ?? []) as OrgRow[] });
  const pick = (dept: string, role: string) => org?.find((r) => r.dept === dept && r.role_title === role)?.display_name ?? undefined;
  const count = (dept: string) => org?.find((r) => r.dept === dept)?.member_count ?? 0;

  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState<Department | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const execRef = useRef<HTMLDivElement>(null);
  const tmlRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [paths, setPaths] = useState<{ size: [number, number]; trunk: string; items: Path[] }>({ size: [0, 0], trunk: "", items: [] });

  useLayoutEffect(() => {
    const box = boxRef.current, exec = execRef.current;
    if (!box || !exec) return;
    const calc = () => {
      const b = box.getBoundingClientRect(), e = exec.getBoundingClientRect();
      const wide = b.width >= 768;
      const spineX = wide ? e.left + e.width / 2 - b.left : 14;
      const y0 = e.bottom - b.top;
      let maxY = y0;
      const items: Path[] = deps.map((d) => {
        const c = cardRefs.current[d.id]?.getBoundingClientRect();
        if (!c) return { id: d.id, d: "" };
        const cy = c.top - b.top + 36;
        maxY = Math.max(maxY, cy);
        const left = c.left - b.left, right = c.right - b.left;
        const edge = left >= spineX ? left : right;
        const r = 10, dir = edge > spineX ? 1 : -1;
        return { id: d.id, d: `M ${spineX} ${y0} V ${cy - r} Q ${spineX} ${cy} ${spineX + dir * r} ${cy} H ${edge}` };
      });
      const t = tmlRef.current?.getBoundingClientRect();
      const top = t ? t.bottom - b.top : y0;
      const tx = t ? (wide ? spineX : t.left - b.left + 24) : spineX;
      const head = wide ? `M ${spineX} ${top} V ${e.top - b.top}` : `M ${tx} ${top} V ${e.top - b.top}`;
      setPaths({ size: [b.width, b.height], trunk: `${head} M ${spineX} ${y0} V ${maxY}`, items });
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(box);
    return () => ro.disconnect();
  }, [deps, org]);

  const active = hover ?? open?.id ?? null;

  return (
    <>
      <PageHero eyebrow="Cơ cấu tổ chức" title="Sơ đồ tổ chức TML" desc="The Mandarin League vận hành bởi Ban Điều hành và 8 Ban chuyên môn." />
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div ref={boxRef} className="relative">
          <svg className="pointer-events-none absolute inset-0 z-0" width={paths.size[0]} height={paths.size[1]} aria-hidden>
            <path d={paths.trunk} className="org-line" />
            {paths.items.map((p) => (
              <path key={p.id} d={p.d} className={`org-line ${active ? (active === p.id ? "org-line-on" : "opacity-40") : ""}`} />
            ))}
          </svg>

          <div className="relative z-10 flex flex-col items-start gap-8 pl-8 md:items-center md:pl-0">
            <div ref={tmlRef} className="rounded-xl bg-primary px-8 py-3 text-center font-bold tracking-wide text-primary-foreground shadow-md">
              THE MANDARIN LEAGUE
              <div className="font-han text-xs font-normal opacity-80">汉语联盟</div>
            </div>
            <div ref={execRef} className="rounded-xl border-2 border-gold bg-card px-8 py-3 text-center font-semibold text-primary-deep shadow-sm">
              {tr("BAN ĐIỀU HÀNH")}
              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Executive Board</div>
            </div>
          </div>

          <div className="relative z-10 mt-12 grid gap-5 pl-8 md:grid-cols-2 md:gap-x-24 md:pl-0">
            {deps.map((d, i) => {
              const head = pick(d.id, "Trưởng Ban"), dep = pick(d.id, "Phó Ban"), n = count(d.id);
              const on = active === d.id, dim = !!active && !on;
              return (
                <button
                  type="button"
                  key={d.id}
                  ref={(el) => { cardRefs.current[d.id] = el; }}
                  onMouseEnter={() => setHover(d.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(d.id)}
                  onBlur={() => setHover(null)}
                  onClick={() => setOpen(d)}
                  className={`group flex flex-col rounded-2xl border bg-card p-5 text-left transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? "scale-[1.02] border-gold shadow-lg shadow-primary/10" : "border-border"} ${dim ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition ${on ? "bg-primary text-primary-foreground" : "bg-gold-soft text-warning-foreground"}`}>{i + 1}</div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-primary-deep">{tr(d.name)}</h3>
                      <div className="text-[11px] font-medium uppercase tracking-wide text-primary">{d.nameEn}</div>
                    </div>
                  </div>
                  <p className={`mt-3 text-sm text-muted-foreground transition-all ${on ? "" : "line-clamp-1"}`}>{tr(d.description)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                    <Leader role={tr("Trưởng Ban")} name={head} loading={isLoading} tr={tr} />
                    <Leader role={tr("Phó Ban")} name={dep} loading={isLoading} tr={tr} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{n ? `${n} ${tr("thành viên")}` : tr("Đang cập nhật")}</span>
                    <span className={`inline-flex items-center gap-1 font-medium text-primary transition ${on ? "opacity-100" : "opacity-0"}`}>{tr("Xem chi tiết")}<ArrowRight className="h-3.5 w-3.5" /></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <div className="text-xs font-semibold uppercase tracking-widest text-gold">{open.nameEn}</div>
                <SheetTitle className="text-2xl text-primary-deep">{tr(open.name)}</SheetTitle>
                <SheetDescription>{tr(open.description)}</SheetDescription>
              </SheetHeader>
              {open.responsibilities && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {open.responsibilities.map((r) => <span key={r} className="rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground">{tr(r)}</span>)}
                </div>
              )}
              <div className="mt-6 space-y-4 rounded-xl border border-border p-4">
                <PersonSlot role="Trưởng ban" name={pick(open.id, "Trưởng Ban")} />
                <PersonSlot role="Phó ban" name={pick(open.id, "Phó Ban")} />
                <div className="flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />{tr("Thành viên")}: {count(open.id) || tr("Đang cập nhật")}
                </div>
              </div>
              <Link to="/join" search={{ ban: open.id }} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                {tr("Ứng tuyển vào Ban này")}<ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Leader({ role, name, loading, tr }: { role: string; name?: string | undefined; loading: boolean; tr: (s: string) => string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-primary">{initials(name) || "—"}</div>
      <div className="min-w-0">
        <div className="text-muted-foreground">{role}</div>
        <div className="truncate font-medium text-foreground">{loading ? "…" : name ?? tr("Đang cập nhật")}</div>
      </div>
    </div>
  );
}
