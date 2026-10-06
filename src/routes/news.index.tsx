import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHero } from "@/components/site/SiteLayout";
import { Chips, DemoBadge, EmptyState } from "@/components/site/ui";
import { getNews, NEWS_CATEGORIES } from "@/lib/data/news";
import type { NewsCategory } from "@/lib/data/types";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/news/")({
  head: () => ({ meta: pageMeta("Tin tức", "Tin tức chính thức của TML về tiếng Trung, HSK, giáo dục và văn hóa.") }),
  component: PNews,
});

function PNews() {
  const [cat, setCat] = useState<NewsCategory | "all">("all");
  const list = getNews().filter((n) => cat === "all" || n.category === cat);
  return (
    <>
      <PageHero eyebrow="Tin tức" title="Tin tức & kiến thức" desc="Nội dung chính thức do The Mandarin League biên soạn." />
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <Chips items={NEWS_CATEGORIES} value={cat} onChange={setCat} />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><EmptyState desc="Chưa có bài viết trong danh mục này." /></div>}
          {list.map((n) => (
            <Link key={n.slug} to="/news/$slug" params={{ slug: n.slug }} className="overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10">
              <div className="grid-lines flex h-36 items-center justify-center bg-accent"><span className="font-han text-5xl text-primary/70">{n.glyph}</span></div>
              <div className="p-5">
                <div className="flex items-center justify-between text-xs"><span className="font-semibold text-primary">{n.category}</span>{n.demo && <DemoBadge />}</div>
                <h3 className="mt-2 font-semibold">{n.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{n.summary}</p>
                <div className="mt-3 text-xs text-muted-foreground">{n.author} · {n.date}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
