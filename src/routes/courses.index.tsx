import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, CalendarDays, Users, Video, Wallet } from "lucide-react";
import { EnrollmentDialog } from "@/components/courses/EnrollmentDialog";
import { classFee, fmtDate, HSK_LEVELS, usePublishedClasses, type HskClass } from "@/lib/hsk-classes";
import { PageHero } from "@/components/site/SiteLayout";
import { EmptyState } from "@/components/site/ui";
import { pageMeta } from "@/lib/seo";
import { programFee, STATUS_LABEL, TYPE_LABEL, usePublishedPrograms, type Program } from "@/lib/programs";

export const Route = createFileRoute("/courses/")({ staticData: { sitemap: true },
  head: () => ({ meta: pageMeta("Khóa học", "Lớp HSK 1–6 và các chương trình học tiếng Trung của The Mandarin League: cộng đồng, giao tiếp, phát âm, chuyên đề.") }),
  component: Programs,
});

type Filter = "all" | "hsk" | "programs" | "free" | "paid" | "enrolling" | "ended";
const FILTERS: [Filter, string][] = [["all", "Tất cả"], ["hsk", "HSK"], ["programs", "Chương trình"], ["free", "Miễn phí"], ["paid", "Có phí"], ["enrolling", "Đang tuyển"], ["ended", "Đã kết thúc"]];

function Programs() {
  const { data, isLoading } = usePublishedPrograms();
  const { data: classes, isLoading: lc } = usePublishedClasses();
  const [t, setT] = useState<Filter>("all");
  const [lv, setLv] = useState(0);
  const [enroll, setEnroll] = useState<HskClass | null>(null);
  const feeOk = (free: boolean) => (t !== "free" || free) && (t !== "paid" || !free);
  const stOk = (s: string) => (t !== "enrolling" || s === "enrolling") && (t !== "ended" || s === "ended");
  const showHsk = t !== "programs", showProg = t !== "hsk";
  const cls = (classes ?? []).filter((c) => (!lv || c.level === lv) && feeOk(c.fee_type === "free") && stOk(c.status));
  const progs = (data ?? []).filter((p) => p.show_in_courses !== false && feeOk(p.course_type === "FREE_COMMUNITY") && stOk(p.status));
  return (
    <>
      <PageHero eyebrow="Khóa học" title="Học tiếng Trung cùng The Mandarin League" desc="Các lớp HSK 1–6 theo lộ trình và những chương trình học cộng đồng, chuyên đề — học trực tuyến." />
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setT(k)} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${t === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>{l}</button>
          ))}
        </div>

        {showHsk && <div className="mt-10">
          <h2 className="text-2xl font-bold text-primary-deep">KHÓA HỌC HSK</h2>
          <p className="text-sm text-muted-foreground">Lộ trình chuẩn HSK 1–6. <Link to="/courses/hsk" className="font-semibold text-primary">Xem nội dung từng cấp →</Link></p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[0, ...HSK_LEVELS].map((l) => <button key={l} onClick={() => setLv(l)} className={`rounded-lg border px-3 py-1 text-sm font-bold ${lv === l ? "border-primary bg-accent text-primary" : "border-border"}`}>{l ? `HSK ${l}` : "Tất cả"}</button>)}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {lc && <p className="text-muted-foreground">Đang tải…</p>}
            {!lc && cls.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><EmptyState title="Lớp HSK đang cập nhật" desc="TML sẽ sớm mở lớp mới." /></div>}
            {cls.map((c) => {
              const full = (c.seats ?? 0) >= c.max_students;
              return (
                <div key={c.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
                  {c.thumb ? <img src={c.thumb} alt={c.name} loading="lazy" className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center bg-brand-gradient"><span className="text-3xl font-bold text-primary-foreground">HSK {c.level}</span></div>}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap gap-2"><span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">HSK {c.level}</span><span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{full ? "Đã đủ sĩ số" : STATUS_LABEL[c.status]}</span></div>
                    <h3 className="mt-3 text-lg font-semibold">{c.name}</h3>
                    {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                    <div className="mt-auto grid gap-1 pt-4 text-sm text-muted-foreground">
                      {(c.start_date || c.schedule) && <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{[fmtDate(c.start_date) && `${fmtDate(c.start_date)}${c.end_date ? ` → ${fmtDate(c.end_date)}` : ""}`, c.schedule].filter(Boolean).join(" · ")}</span>}
                      <span className="flex items-center gap-2"><Video className="h-4 w-4" />{c.format}{c.duration && ` · ${c.duration}`}</span>
                      <span className="flex items-center gap-2"><Users className="h-4 w-4" />{c.seats}/{c.max_students} học viên</span>
                      <span className="flex items-center gap-2 font-semibold text-primary-deep"><Wallet className="h-4 w-4" />{classFee(c)}</span>
                    </div>
                    {c.status === "enrolling" && !full && (c.registration_url
                      ? <a href={c.registration_url} target="_blank" rel="noreferrer" className="mt-4 rounded-full bg-primary py-2 text-center text-sm font-semibold text-primary-foreground">Đăng ký</a>
                      : <button onClick={() => setEnroll(c)} className="mt-4 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground">Đăng ký lớp này</button>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>}

        {showProg && <div className="mt-14">
          <h2 className="text-2xl font-bold text-primary-deep">CHƯƠNG TRÌNH HỌC</h2>
          <p className="text-sm text-muted-foreground">Các chương trình giáo dục của The Mandarin League.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading && <p className="text-muted-foreground">Đang tải…</p>}
            {!isLoading && progs.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><EmptyState title="Chương trình đang cập nhật" desc="TML sẽ sớm công bố chương trình mới." /></div>}
            {progs.map((p) => <ProgramCard key={p.id} p={p} />)}
          </div>
        </div>}
      </section>
      {enroll && <EnrollmentDialog level={enroll.level} classId={enroll.id} title={enroll.name} fee={classFee(enroll)} onClose={() => setEnroll(null)} />}
    </>
  );
}

export function ProgramCard({ p }: { p: Program }) {
  return (
    <Link to="/courses/$slug" params={{ slug: p.slug }} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
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
  );
}
