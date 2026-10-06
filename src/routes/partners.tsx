import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Handshake } from "lucide-react";
import { PageHero, CONTACT } from "@/components/site/SiteLayout";
import { Chips, EmptyState } from "@/components/site/ui";
import { getPartners, PARTNER_CATEGORIES } from "@/lib/data/partners";
import type { PartnerCategory } from "@/lib/data/types";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/partners")({
  head: () => ({ meta: pageMeta("Đối tác", "Các đối tác giáo dục, công nghệ và cộng đồng đồng hành cùng The Mandarin League.") }),
  component: PPartners,
});

function PPartners() {
  const [cat, setCat] = useState<PartnerCategory | "all">("all");
  const list = getPartners().filter((p) => cat === "all" || p.category === cat);
  return (
    <>
      <PageHero eyebrow="Đối tác" title="Đồng hành cùng TML" desc="Cùng kiến tạo cơ hội học tập và kết nối Việt Nam – Trung Quốc." />
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <Chips items={PARTNER_CATEGORIES} value={cat} onChange={setCat} />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><EmptyState desc="Danh sách đối tác sẽ được TML công bố chính thức." /></div>}
          {list.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-6">
              {p.logoUrl ? <img src={p.logoUrl} alt={p.name} className="h-12 object-contain" /> : <Handshake className="h-10 w-10 text-primary" />}
              <div className="mt-4 font-bold">{p.name}</div><div className="text-xs text-primary">{p.category} · {p.field}</div>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Website <ArrowUpRight className="h-3.5 w-3.5" /></a>}
            </div>
          ))}
        </div>
        <div className="mt-14 rounded-3xl bg-brand-gradient p-10 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold">Bạn muốn hợp tác cùng TML?</h2>
          <a href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Hợp tác cùng TML")}`} className="mt-6 inline-flex rounded-full bg-background px-7 py-3 font-semibold text-primary-deep hover:opacity-90">TRỞ THÀNH ĐỐI TÁC</a>
        </div>
      </section>
    </>
  );
}
