import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { DemoBadge, EmptyState } from "@/components/site/ui";
import { getArticle } from "@/lib/data/news";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/news/$slug")({ staticData: { sitemap: true },
  loader: ({ params }) => {
    const article = getArticle(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [...pageMeta(loaderData.article.title, loaderData.article.summary).filter((m) => !("property" in m && m.property === "og:type")), { property: "og:type", content: "article" }] : [{ title: "Không tìm thấy bài viết" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: ArticleNotFound,
  component: PArticle,
});

function ArticleNotFound() {
  return <div className="mx-auto max-w-3xl px-4 py-20"><EmptyState title="Không tìm thấy bài viết" /><div className="mt-6 text-center"><Link to="/news" className="font-semibold text-primary">← Tin tức</Link></div></div>;
}

function PArticle() {
  const { article: a } = Route.useLoaderData();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <Link to="/news" className="text-sm font-medium text-primary">← Tin tức</Link>
      <div className="mt-4 flex items-center gap-2 text-sm"><span className="font-semibold text-primary">{a.category}</span>{a.demo && <DemoBadge />}</div>
      <h1 className="mt-2 text-3xl font-bold text-primary-deep md:text-4xl">{a.title}</h1>
      <div className="mt-2 text-sm text-muted-foreground">{a.author} · {a.date}</div>
      <div className="grid-lines mt-6 flex h-56 items-center justify-center rounded-3xl bg-accent"><span className="font-han text-7xl text-primary/70">{a.glyph}</span></div>
      <p className="mt-6 text-lg font-medium">{a.summary}</p>
      <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground">{a.body.map((p) => <p key={p}>{p}</p>)}</div>
    </article>
  );
}
