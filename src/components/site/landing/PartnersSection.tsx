import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Handshake } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { EmptyState, SectionLabel } from "@/components/site/ui";
import { useActivePartners } from "@/lib/news-db";
import { useSiteContent } from "@/lib/site-content";

export function PartnersSection() {
  const tr = useTr();
  const partnerQuery = useActivePartners();
  const partners = partnerQuery.data ?? [];
  const site = useSiteContent("site").data;

  return (
    <section id="partners" className="scroll-mt-24 bg-secondary py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 reveal-on-scroll">
          <div>
            <SectionLabel>{tr("Đối tác đồng hành")}</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">
              {tr("Cùng TML mở rộng cơ hội học tập")}
            </h2>
          </div>
          <Link
            to="/partners"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            {tr("Xem tất cả đối tác")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {partners.length === 0 ? (
          <div className="mt-8 reveal-on-scroll">
            <EmptyState desc={tr("Danh sách đối tác sẽ được TML công bố chính thức.")} />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 reveal-on-scroll">
            {partners.slice(0, 10).map((p) => {
              const logo = p.logo ? (
                <img
                  src={p.logo}
                  alt={p.name}
                  loading="lazy"
                  className="max-h-12 max-w-full object-contain"
                />
              ) : (
                <span className="text-center text-sm font-semibold text-primary-deep">
                  {p.name}
                </span>
              );
              return p.website_url ? (
                <a
                  key={p.id}
                  href={p.website_url}
                  target="_blank"
                  rel="noreferrer"
                  title={p.name}
                  className="group flex h-24 items-center justify-center rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  {logo}
                </a>
              ) : (
                <div
                  key={p.id}
                  title={p.name}
                  className="flex h-24 items-center justify-center rounded-2xl border border-border bg-card p-5"
                >
                  {logo}
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground reveal-on-scroll">
          <Handshake className="h-5 w-5 text-primary" />
          <span>{tr("Bạn muốn hợp tác cùng TML?")}</span>
          <a
            href={`mailto:${site.email}?subject=${encodeURIComponent(tr("Hợp tác cùng TML"))}`}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            {tr("Liên hệ hợp tác")} <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
