import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, MapPin, Search } from "lucide-react";
import { PageHero } from "@/components/site/SiteLayout";
import { EmptyState } from "@/components/site/ui";
import { pageMeta } from "@/lib/seo";
import { usePublishedPrograms } from "@/lib/programs";
import { ProgramCard } from "@/components/courses/ProgramCard";
import { CATEGORY_LABEL, LIVE_LABEL, LOCATION_LABEL, fmtDateTime, liveStatus, usePublicActivities, type ActivityCategory, type LiveStatus, type LocationType } from "@/lib/activities";

export const Route = createFileRoute("/activities/")({ staticData: { sitemap: true },
  head: () => ({ meta: pageMeta("Hoạt động", "Workshop, cuộc thi, trại, sự kiện và hoạt động cộng đồng chính thức của The Mandarin League.") }),
  component: PActivities,
});

const sel = "rounded-lg border border-input bg-background px-3 py-2 text-sm";

function PActivities() {
  const [cat, setCat] = useState<ActivityCategory | "education" | "">("");
  const [time, setTime] = useState<LiveStatus | "">("");
  const [loc, setLoc] = useState<LocationType | "">("");
  const [q, setQ] = useState("");
  const acts = usePublicActivities();
  const { data: programs } = usePublishedPrograms();
  const term = q.trim().toLowerCase();
  const progs = cat === "" || cat === "education"
    ? (programs ?? []).filter((p) => p.show_in_activities && (!term || p.title.toLowerCase().includes(term))) : [];
  const list = cat === "education" ? [] : (acts.data ?? []).filter((a) =>
    (!cat || a.category === cat) && (!time || liveStatus(a) === time) && (!loc || a.location_type === loc) &&
    (!term || `${a.title} ${a.short_description}`.toLowerCase().includes(term)));
  return (
    <>
      <PageHero eyebrow="Hoạt động" title="Học qua trải nghiệm" desc="Các chương trình chính thức do TML tổ chức." />
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input className={`${sel} w-full pl-9`} placeholder="Tìm hoạt động…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <select className={sel} value={cat} onChange={(e) => setCat(e.target.value as typeof cat)}>
            <option value="">Tất cả loại</option>{Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={sel} value={time} onChange={(e) => setTime(e.target.value as typeof time)}>
            <option value="">Mọi thời gian</option>{(["upcoming", "ongoing", "ended"] as const).map((k) => <option key={k} value={k}>{LIVE_LABEL[k].label}</option>)}
          </select>
          <select className={sel} value={loc} onChange={(e) => setLoc(e.target.value as typeof loc)}>
            <option value="">Mọi hình thức</option>{Object.entries(LOCATION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {acts.isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
          {!acts.isLoading && list.length === 0 && progs.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><EmptyState desc="Chưa có hoạt động phù hợp." /></div>}
          {list.map((a) => { const s = LIVE_LABEL[liveStatus(a)]; return (
            <Link key={a.id} to="/activities/$activityId" params={{ activityId: a.slug }} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10">
              {a.banner ? <img src={a.banner} alt={a.title} loading="lazy" className="aspect-video w-full object-cover" /> : <div className="grid-lines flex aspect-video items-center justify-center bg-accent"><CalendarDays className="h-10 w-10 text-primary/60" /></div>}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between gap-2 text-xs"><span className="font-semibold uppercase tracking-wider text-primary">{CATEGORY_LABEL[a.category]}</span><span className={`rounded-full px-2.5 py-0.5 font-semibold ${s.tone}`}>{s.label}</span></div>
                <h3 className="mt-3 font-semibold">{a.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.short_description}</p>
                <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fmtDateTime(a.start_time)}</span><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{LOCATION_LABEL[a.location_type]}{a.location_detail && a.location_type !== "online" ? ` · ${a.location_detail}` : ""}</span></div>
                <span className="mt-3 text-sm font-semibold text-primary">Xem chi tiết →</span>
              </div>
            </Link>); })}
        </div>
        {progs.length > 0 && <div className="mt-14">
          <h2 className="text-2xl font-bold text-primary-deep">CHƯƠNG TRÌNH HỌC</h2>
          <p className="text-sm text-muted-foreground">Chương trình học thuật của TML — cùng thông tin với trang Khóa học.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{progs.map((p) => <ProgramCard key={p.id} p={p} />)}</div>
        </div>}
      </section>
    </>
  );
}
