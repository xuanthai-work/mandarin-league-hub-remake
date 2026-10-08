import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyState } from "@/components/site/ui";
import { fmtDate, usePublishedArticle } from "@/lib/news-db";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/news/$slug")({ staticData: { sitemap: false },
  head: () => ({ meta: [...pageMeta("Bài viết", "Bài viết chính thức của The Mandarin League.").filter((m) => !("property" in m && m.property === "og:type")), { property: "og:type", content: "article" }] }),
  component: PArticle,
});

function PArticle() {
  const { slug } = Route.useParams();
  const q = usePublishedArticle(slug);
  if (q.isLoading) return <p className="p-16 text-center text-muted-foreground">Đang tải…</p>;
  const a = q.data;
  if (!a) return <div className="mx-auto max-w-3xl px-4 py-20"><EmptyState title="Không tìm thấy bài viết" /><div className="mt-6 text-center"><Link to="/news" className="font-semibold text-primary">← Tin tức</Link></div></div>;
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <title>{`${a.title} | The Mandarin League`}</title>
      <Link to="/news" className="text-sm font-medium text-primary">← Tin tức</Link>
      <div className="mt-4 text-sm font-semibold text-primary">{a.category}</div>
      <h1 className="mt-2 text-3xl font-bold text-primary-deep md:text-4xl">{a.title}</h1>
      <div className="mt-2 text-sm text-muted-foreground">{a.author_name} · {fmtDate(a.published_at)}</div>
      {a.cover && <img src={a.cover} alt={a.title} className="mt-6 max-h-96 w-full rounded-3xl object-cover" />}
      {a.summary && <p className="mt-6 text-lg font-medium">{a.summary}</p>}
      <div className="mt-4 space-y-4 whitespace-pre-line leading-relaxed text-muted-foreground">
        {a.content.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </article>
  );
}
