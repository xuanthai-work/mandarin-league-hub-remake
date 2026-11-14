import { ArrowRight } from "lucide-react";
import { useT, useTr } from "@/lib/i18n";
import type { HomeContent } from "@/lib/site-content";

export function HeroSection({ h }: { h: HomeContent }) {
  const { lang, t } = useT();
  const tr = useTr();

  return (
    <section id="hero" className="grid-lines relative scroll-mt-24 overflow-hidden bg-secondary">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:px-6 md:py-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            {h.hero_badge || tr("Online Chinese Learning Community")}
          </div>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-primary-deep md:text-6xl">
            {h.hero_title || "The Mandarin League"}
          </h1>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 text-2xl font-semibold text-primary md:text-3xl">
            <span>{tr("Liên Đoàn Hán Ngữ")}</span>
            {lang !== "zh" && <span className="font-han">普通话联盟</span>}
          </div>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {h.hero_lead || t("home.lead")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={h.btn1_url || "/join"}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
            >
              {h.btn1_label || t("cta.join")} <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={
                !h.btn2_url || h.btn2_url === "/courses" || h.btn2_url === "/courses/hsk"
                  ? "#courses"
                  : h.btn2_url
              }
              onClick={(e) => {
                if (!h.btn2_url || h.btn2_url === "/courses" || h.btn2_url === "/courses/hsk") {
                  e.preventDefault();
                  document
                    .getElementById("courses")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  window.history.replaceState(null, "", "#courses");
                }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background px-6 py-3 font-semibold text-primary-deep transition hover:bg-accent"
            >
              {h.btn2_label || t("cta.hsk")}
            </a>
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
