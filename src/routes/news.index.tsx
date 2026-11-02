import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Star } from "lucide-react";
import { PageHero } from "@/components/site/SiteLayout";
import { Chips, EmptyState } from "@/components/site/ui";
import { NEWS_CATEGORIES } from "@/lib/data/news";
import type { NewsCategory } from "@/lib/data/types";
import { fmtDate, usePublishedNews } from "@/lib/news-db";
import { pageMeta } from "@/lib/seo";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/news/")({ staticData: { sitemap: true },
  head: () => ({ meta: pageMeta("Tin tức", "Tin tức chính thức của TML về tiếng Trung, HSK, giáo dục và văn hóa.") }),
  component: PNews,
});

function PNews() {
  const tr = useTr();
  const [cat, setCat] = useState<NewsCategory | "all">("all");
  const news = usePublishedNews();
  const list = (news.data ?? []).filter((n) => cat === "all" || n.category === cat);
  return (
    <>
      <PageHero eyebrow="Tin tức" title="Tin tức & kiến thức" desc="Nội dung chính thức do The Mandarin League biên soạn." />
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <Chips items={NEWS_CATEGORIES} value={cat} onChange={setCat} />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {news.isLoading && <p className="text-sm text-muted-foreground">{tr("Đang tải…")}</p>}
          {!news.isLoading && list.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><EmptyState desc="Chưa có bài viết trong danh mục này." /></div>}
          {list.map((n) => (
            <Link key={n.id} to="/news/$slug" params={{ slug: n.slug }} className="overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10">
              {n.cover ? <img src={n.cover} alt={n.title} className="h-40 w-full object-cover" /> : <div className="grid-lines flex h-40 items-center justify-center bg-accent"><span className="font-han text-5xl text-primary/70">文</span></div>}
              <div className="p-5">
                <div className="flex items-center justify-between text-xs"><span className="font-semibold text-primary">{n.category}</span>{n.is_featured && <Star className="h-4 w-4 fill-gold text-gold" />}</div>
                <h3 className="mt-2 font-semibold">{n.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{n.summary}</p>
                <div className="mt-3 text-xs text-muted-foreground">{n.author_name} · {fmtDate(n.published_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
