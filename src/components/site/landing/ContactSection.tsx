import { Link } from "@tanstack/react-router";
import { ArrowRight, AtSign, Facebook, Instagram, Linkedin, Mail, Music2 } from "lucide-react";
import { useT, useTr } from "@/lib/i18n";
import { ContactForm } from "@/components/site/ContactForm";
import { useSiteContent, type HomeContent, type SiteSettings } from "@/lib/site-content";

export function ContactSection({ h, site: propSite }: { h: HomeContent; site?: SiteSettings }) {
  const { t } = useT();
  const tr = useTr();
  const siteHook = useSiteContent("site").data;
  const site = propSite ?? siteHook;

  return (
    <section id="contact" className="scroll-mt-24 border-t border-border py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col justify-between gap-8 rounded-3xl bg-brand-gradient p-8 text-primary-foreground md:p-12">
            <div>
              <div className="text-sm font-semibold uppercase tracking-widest opacity-80">
                {tr("Kết nối & Ứng tuyển")}
              </div>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                {h.cta_title || tr("Sẵn sàng trở thành một phần của TML?")}
              </h2>
              <p className="mt-4 max-w-lg opacity-90">
                {h.cta_body ||
                  tr(
                    "Ứng tuyển vào một trong 8 Ban, học hỏi kỹ năng mới và cùng lan tỏa tình yêu tiếng Trung.",
                  )}
              </p>
              <Link
                to="/join"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 font-semibold text-primary-deep transition hover:opacity-90"
              >
                {t("cta.join")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3 border-t border-primary-foreground/20 pt-6 text-sm">
              <a href={`mailto:${site.email}`} className="flex items-center gap-3 hover:underline">
                <Mail className="h-5 w-5" />
                {site.email}
              </a>
              <a
                href={site.facebook}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 hover:underline"
              >
                <Facebook className="h-5 w-5" />
                Facebook TML
              </a>
              <a
                href={site.instagram}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 hover:underline"
              >
                <Instagram className="h-5 w-5" />
                Instagram TML
              </a>
              {site.threads && (
                <a
                  href={site.threads}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 hover:underline"
                >
                  <AtSign className="h-5 w-5" />
                  Threads TML
                </a>
              )}
              {site.tiktok && (
                <a
                  href={site.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 hover:underline"
                >
                  <Music2 className="h-5 w-5" />
                  TikTok TML
                </a>
              )}
              {site.linkedin && (
                <a
                  href={site.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 hover:underline"
                >
                  <Linkedin className="h-5 w-5" />
                  LinkedIn TML
                </a>
              )}
            </div>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
