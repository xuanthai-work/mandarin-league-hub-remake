import { ArrowRight } from "lucide-react";
import { useT, useTr } from "@/lib/i18n";
import { appendPreview, usePreviewMode, type HomeContent } from "@/lib/site-content";
import { CtaLink } from "@/components/site/CtaLink";

export function HeroSection({ h }: { h: HomeContent }) {
  const { lang, t } = useT();
  const tr = useTr();
  const preview = usePreviewMode();

  return (
    <section id="hero" className="grid-lines relative scroll-mt-24 overflow-hidden bg-secondary">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:px-6 md:py-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            {tr("Online Chinese Learning Community")}
          </div>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-primary-deep md:text-6xl">
            The Mandarin League
          </h1>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 text-2xl font-semibold text-primary md:text-3xl">
            <span>{tr("Liên Đoàn Hán Ngữ")}</span>
            {lang !== "zh" && <span className="font-han">普通话联盟</span>}
          </div>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {h.hero_lead || t("home.lead")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaLink
              href={appendPreview("/join", preview)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
            >
              {t("cta.join")} <ArrowRight className="h-4 w-4" />
            </CtaLink>
            <CtaLink
              href="#courses"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("courses")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                window.history.replaceState(null, "", "#courses");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background px-6 py-3 font-semibold text-primary-deep transition hover:bg-accent"
            >
              {t("cta.hsk")}
            </CtaLink>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute inset-0 rounded-full bg-primary/15 blur-3xl" />
          <img
            src="/logo.svg"
            alt="Logo The Mandarin League"
            className="relative w-full rounded-full bg-background p-4 shadow-2xl shadow-primary/20"
          />
        </div>
      </div>
    </section>
  );
}
