import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, CalendarDays, Video, Wallet } from "lucide-react";
import { PageHero } from "@/components/site/SiteLayout";
import { EmptyState } from "@/components/site/ui";
import { pageMeta } from "@/lib/seo";
import { programFee, STATUS_LABEL, TYPE_LABEL, usePublishedPrograms, type CourseType } from "@/lib/programs";

export const Route = createFileRoute("/courses/")({ staticData: { sitemap: true },
  head: () => ({ meta: pageMeta("Chương trình học", "Các chương trình học tiếng Trung của TML: miễn phí cộng đồng, khóa học chuyên sâu và chương trình đặc biệt.") }),
  component: Programs,
});

const TYPES = Object.keys(TYPE_LABEL) as CourseType[];

function Programs() {
  const { data, isLoading } = usePublishedPrograms();
  const [t, setT] = useState<CourseType | "all">("all");
  const list = (data ?? []).filter((p) => t === "all" || p.course_type === t);
  return (
    <>
      <PageHero eyebrow="Chương trình học" title="Học tiếng Trung cùng TML" desc="Lớp miễn phí vì cộng đồng, khóa học chuyên sâu và các chương trình đặc biệt — học trực tuyến." />
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <Link to="/courses/hsk" className="flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-accent p-5 hover:border-primary">
          <div className="flex items-center gap-3"><BookOpen className="h-6 w-6 text-primary" /><div><div className="font-semibold text-primary-deep">Lộ trình HSK 1–6</div><div className="text-sm text-muted-foreground">Xem các lớp HSK theo cấp độ</div></div></div>
          <span className="text-sm font-semibold text-primary">Xem →</span>
        </Link>
        <div className="mt-8 flex flex-wrap gap-2">
          {(["all", ...TYPES] as const).map((k) => (
            <button key={k} onClick={() => setT(k)} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${t === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>
              {k === "all" ? "Tất cả" : TYPE_LABEL[k].label}
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && <p className="text-muted-foreground">Đang tải…</p>}
          {!isLoading && list.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><EmptyState title="Chương trình đang cập nhật" desc="TML sẽ sớm công bố chương trình mới." /></div>}
          {list.map((p) => (
            <Link key={p.id} to="/courses/$slug" params={{ slug: p.slug }} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
              {p.thumb ? <img src={p.thumb} alt={p.title} loading="lazy" className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center bg-brand-gradient"><BookOpen className="h-10 w-10 text-primary-foreground" /></div>}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${TYPE_LABEL[p.course_type].tone}`}>{TYPE_LABEL[p.course_type].label}</span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{STATUS_LABEL[p.status]}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold">{p.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.short_description}</p>
                <div className="mt-auto grid gap-1 pt-4 text-sm text-muted-foreground">
                  {p.schedule && <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{p.schedule}</span>}
                  <span className="flex items-center gap-2"><Video className="h-4 w-4" />{p.format}{p.level && ` · ${p.level}`}</span>
                  <span className="flex items-center gap-2 font-semibold text-primary-deep"><Wallet className="h-4 w-4" />{programFee(p)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
