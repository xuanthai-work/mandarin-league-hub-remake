import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Clock, ExternalLink, MapPin, Users } from "lucide-react";
import { EmptyState } from "@/components/site/ui";
import { ActivityRegisterBox } from "@/components/site/ActivityRegisterBox";
import { pageMeta } from "@/lib/seo";
import {
  CATEGORY_LABEL,
  LIVE_LABEL,
  LOCATION_LABEL,
  fmtDateTime,
  liveStatus,
  usePublicActivity,
} from "@/lib/activities";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/activities/$activityId")({
  staticData: { sitemap: false },
  head: () => ({
    meta: pageMeta(
      "Chi tiết hoạt động",
      "Thông tin chi tiết và đăng ký tham gia hoạt động của The Mandarin League.",
    ),
  }),
  component: PActivity,
});

function PActivity() {
  const tr = useTr();
  const { activityId } = Route.useParams();
  const { data: a, isLoading } = usePublicActivity(activityId);
  if (isLoading)
    return <p className="p-20 text-center text-sm text-muted-foreground">{tr("Đang tải…")}</p>;
  if (!a)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="Không tìm thấy hoạt động" />
        <div className="mt-6 text-center">
          <Link to="/activities" className="font-semibold text-primary">
            {tr("← Tất cả hoạt động")}
          </Link>
        </div>
      </div>
    );
  const s = LIVE_LABEL[liveStatus(a)];
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
      <Link to="/activities" className="text-sm font-medium text-primary">
        {tr("← Hoạt động")}
      </Link>
      {a.banner ? (
        <img
          src={a.banner}
          alt={a.title}
          className="mt-4 aspect-[21/9] w-full rounded-3xl object-cover"
        />
      ) : (
        <div className="grid-lines mt-4 flex aspect-[21/9] items-center justify-center rounded-3xl bg-accent">
          <CalendarDays className="h-14 w-14 text-primary/60" />
        </div>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {tr(CATEGORY_LABEL[a.category])}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.tone}`}>
          {tr(s.label)}
        </span>
      </div>
      <h1 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">{a.title}</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          {a.short_description && (
            <p className="text-lg text-muted-foreground">{a.short_description}</p>
          )}
          <p className="mt-4 whitespace-pre-line leading-relaxed">{a.description}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {a.facebook_url && (
              <a
                href={a.facebook_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Facebook <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {a.website_url && (
              <a
                href={a.website_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Website <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
        <aside className="h-fit space-y-3 rounded-2xl border border-border bg-card p-5 text-sm">
          <p className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
            {tr(fmtDateTime(a.start_time))}
            {a.end_time && ` → ${tr(fmtDateTime(a.end_time))}`}
          </p>
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-primary" />
            {tr(LOCATION_LABEL[a.location_type])}
            {a.location_detail && a.location_type !== "online" && ` · ${a.location_detail}`}
          </p>
          {a.registration_deadline && (
            <p className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 text-primary" />
              {tr("Hạn đăng ký")}: {tr(fmtDateTime(a.registration_deadline))}
            </p>
          )}
          {a.max_participants > 0 && (
            <p className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 text-primary" />
              {tr("Tối đa")} {a.max_participants} {tr("người")}
            </p>
          )}
          <ActivityRegisterBox a={a} />
        </aside>
      </div>
    </div>
  );
}
