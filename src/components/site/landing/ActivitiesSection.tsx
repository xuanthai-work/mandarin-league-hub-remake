import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Star } from "lucide-react";
import { useTr } from "@/lib/i18n";
import {
  CATEGORY_LABEL,
  fmtDateTime,
  usePublicActivities,
  type ActivityCategory,
  type ActivityRow,
} from "@/lib/activities";
import { EmptyState, SectionLabel } from "@/components/site/ui";
import { PhotoOverlayCard } from "@/components/site/PhotoOverlayCard";
import { ActivityCarousel } from "@/components/site/ActivityCarousel";
import { fmtDate as fmtNewsDate, usePublishedNews, type NewsRow } from "@/lib/news-db";
import type { HomeContent } from "@/lib/site-content";

const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  "workshop",
  "competition",
  "camp",
  "event",
  "community",
  "other",
];

export function ActivitiesSection({
  h,
  onSelectActivity,
  onSelectNews,
}: {
  h: HomeContent;
  onSelectActivity: (activity: ActivityRow) => void;
  onSelectNews: (news: NewsRow) => void;
}) {
  const tr = useTr();
  const [activityCat, setActivityCat] = useState<ActivityCategory | "all">("all");

  const activities = usePublicActivities();
  const acts = (activities.data ?? [])
    .filter((a) => activityCat === "all" || a.category === activityCat)
    .slice(0, 6);

  const news = usePublishedNews();
  const articles = (news.data ?? []).slice(0, 3);

  return (
    <section id="activities" className="scroll-mt-24 bg-secondary py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>{tr("Hoạt động tiêu biểu")}</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">
              {tr("Học qua trải nghiệm")}
            </h2>
          </div>
          <Link
            to="/activities"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            {tr("Xem tất cả")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { value: "all" as const, label: tr("Tất cả") },
            ...ACTIVITY_CATEGORIES.map((c) => ({
              value: c,
              label: tr(CATEGORY_LABEL[c]),
            })),
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setActivityCat(option.value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                activityCat === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {acts.length === 0 && (
            <div className="md:col-span-3">
              <EmptyState
                title={tr("Đang cập nhật")}
                desc={tr("Hoạt động mới sẽ sớm được công bố.")}
              />
            </div>
          )}
          {acts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectActivity(a)}
              className="overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            >
              {a.banner ? (
                <img
                  src={a.banner}
                  alt={a.title}
                  loading="lazy"
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="grid-lines flex h-40 items-center justify-center bg-accent">
                  <CalendarDays className="h-10 w-10 text-primary/60" />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-primary">
                    {tr(CATEGORY_LABEL[a.category])}
                  </span>
                  <span className="text-muted-foreground">{tr(fmtDateTime(a.start_time))}</span>
                </div>
                <h3 className="mt-3 font-semibold">{a.title}</h3>
              </div>
            </button>
          ))}
        </div>

        {h.show.carousel && <ActivityCarousel embedded />}

        {/* News lives inside the same section as activities (header item #activities) */}
        <div id="news" className="mt-16 scroll-mt-24 border-t border-border pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>{tr("Bản tin & kiến thức")}</SectionLabel>
              <h3 className="mt-3 text-2xl font-bold text-primary-deep md:text-3xl">
                {tr("Tin tức & kiến thức HSK")}
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {tr("Nội dung chính thức do The Mandarin League biên soạn.")}
              </p>
            </div>
            <Link
              to="/news"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              {tr("Xem tất cả tin tức")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.isLoading && <p className="text-sm text-muted-foreground">{tr("Đang tải…")}</p>}
            {!news.isLoading && articles.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <EmptyState desc={tr("Tin tức mới sẽ sớm được cập nhật.")} />
              </div>
            )}
            {articles.map((n) => (
              <PhotoOverlayCard
                key={n.id}
                image={n.cover}
                imageAlt={n.title}
                fallback={<span className="font-han text-5xl text-primary/70">文</span>}
                eyebrow={n.category}
                badge={n.is_featured ? <Star className="h-4 w-4 fill-gold text-gold" /> : undefined}
                title={n.title}
                subtitle={`${n.author_name} · ${fmtNewsDate(n.published_at)}`}
                description={n.summary}
                actionLabel={tr("Đọc bài viết")}
                onClick={() => onSelectNews(n)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
