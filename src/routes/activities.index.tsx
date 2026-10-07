import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { PageHero } from "@/components/site/SiteLayout";
import { Chips, DemoBadge, EmptyState, StatusBadge } from "@/components/site/ui";
import { ACTIVITY_TYPES, getActivities } from "@/lib/data/activities";
import type { ActivityType } from "@/lib/data/types";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/activities/")({ staticData: { sitemap: true },
  head: () => ({ meta: pageMeta("Hoạt động", "Workshop, cuộc thi, webinar, giao lưu Việt – Trung và dự án cộng đồng của TML.") }),
  component: PActivities,
});

function PActivities() {
  const [type, setType] = useState<ActivityType | "all">("all");
  const list = getActivities().filter((a) => type === "all" || a.type === type);
  return (
    <>
      <PageHero eyebrow="Hoạt động" title="Học qua trải nghiệm" desc="Các chương trình chính thức do TML tổ chức." />
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <Chips items={ACTIVITY_TYPES} value={type} onChange={setType} />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><EmptyState desc="Chưa có hoạt động thuộc loại này." /></div>}
          {list.map((a) => (
            <Link key={a.id} to="/activities/$activityId" params={{ activityId: a.id }} className="overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10">
              <div className="grid-lines flex h-40 items-center justify-center bg-accent"><span className="font-han text-5xl text-primary/70">{a.glyph}</span></div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-2 text-xs"><span className="font-semibold uppercase tracking-wider text-primary">{a.type}</span><div className="flex gap-1.5">{a.demo && <DemoBadge />}<StatusBadge status={a.status} /></div></div>
                <h3 className="mt-3 font-semibold">{a.title}</h3>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{a.date}</span><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{a.mode} · {a.location}</span></div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
