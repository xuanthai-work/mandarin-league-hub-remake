import type { ReactNode } from "react";
import { useTr } from "@/lib/i18n";
import { CrystalParticles } from "./CrystalParticles";
import { Header } from "./SiteHeader";
import { Footer } from "./SiteFooter";

export { CONTACT, LANDING_NAV } from "@/components/site/site-nav";
export type { NavChild, NavPage, LandingNavItem } from "@/components/site/site-nav";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <CrystalParticles />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  const tr = useTr();
  return (
    <section className="grid-lines border-b border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="text-sm font-semibold uppercase tracking-widest text-primary">
          {tr(eyebrow)}
        </div>
        <h1 className="mt-3 text-3xl font-bold text-primary-deep md:text-5xl">{tr(title)}</h1>
        {desc && <p className="mt-4 max-w-2xl text-muted-foreground">{tr(desc)}</p>}
      </div>
    </section>
  );
}
