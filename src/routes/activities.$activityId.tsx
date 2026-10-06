import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CalendarDays, MapPin, Monitor } from "lucide-react";
import { DemoBadge, EmptyState, StatusBadge } from "@/components/site/ui";
import { getActivity } from "@/lib/data/activities";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/activities/$activityId")({
  loader: ({ params }) => {
    const activity = getActivity(params.activityId);
    if (!activity) throw notFound();
    return { activity };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? pageMeta(loaderData.activity.title, loaderData.activity.description) : [{ title: "Không tìm thấy hoạt động" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: ActivityNotFound,
  component: PActivity,
});

function ActivityNotFound() {
  return <div className="mx-auto max-w-3xl px-4 py-20"><EmptyState title="Không tìm thấy hoạt động" /><div className="mt-6 text-center"><Link to="/activities" className="font-semibold text-primary">← Tất cả hoạt động</Link></div></div>;
}

function PActivity() {
  const { activity: a } = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <Link to="/activities" className="text-sm font-medium text-primary">← Hoạt động</Link>
      <div className="grid-lines mt-4 flex h-56 items-center justify-center rounded-3xl bg-accent md:h-72"><span className="font-han text-7xl text-primary/70">{a.glyph}</span></div>
      <div className="mt-6 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-primary">{a.type}</span><StatusBadge status={a.status} />{a.demo && <DemoBadge />}</div>
      <h1 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">{a.title}</h1>
      <div className="mt-5 grid gap-3 rounded-2xl border border-border bg-card p-5 text-sm sm:grid-cols-3">
        <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />{a.date}</span>
        <span className="flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" />{a.mode}</span>
        <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{a.location}</span>
      </div>
      <p className="mt-6 leading-relaxed text-muted-foreground">{a.description}</p>
    </div>
  );
}
