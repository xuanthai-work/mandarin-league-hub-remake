import { useT, useTr } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { AtSign, Facebook, Instagram, Linkedin, Lock, Mail, Music2 } from "lucide-react";
import { useSiteContent } from "@/lib/site-content";

/* 44px circular outline button, one 20px glyph centred on both axes, shared by
   every social icon so the row can never drift out of rhythm. */
const SOCIAL_LINK =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary-foreground/25 text-primary-foreground/85 transition-colors hover:border-gold/70 hover:bg-primary-foreground/10 hover:text-gold focus-visible:outline-none focus-visible:border-gold/70 focus-visible:text-gold focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-deep";

/** Tài khoản mặc định khi Trang & Nội dung chưa đặt liên kết riêng. */
const THREADS_URL = "https://www.threads.com/@liendoanhanngu";
const TIKTOK_URL = "https://www.tiktok.com/@themandarinleague?is_from_webapp=1&sender_device=pc";

const LEGAL_LINK =
  "rounded-sm py-1 text-primary-foreground/75 underline-offset-4 transition-colors hover:text-gold hover:underline focus-visible:outline-none focus-visible:text-gold focus-visible:ring-2 focus-visible:ring-gold/70";

export function Footer() {
  const { t } = useT();
  const tr = useTr();
  const site = useSiteContent("site").data;

  return (
    <footer className="mt-24 bg-primary-deep text-primary-foreground">
      {/* Brand & contact — the only content of the footer body; the header owns navigation. */}
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:py-6">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,65fr)_minmax(260px,35fr)] lg:items-center lg:gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt=""
                className="h-12 w-12 shrink-0 rounded-full object-contain"
              />
              <div className="min-w-0">
                <div className="font-bold">THE MANDARIN LEAGUE</div>
                <div className="text-sm text-primary-foreground/85">{t("brand.sub")}</div>
                <div className="text-xs text-primary-foreground/75">
                  {tr("Online Chinese Learning Community")}
                </div>
              </div>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/85 md:whitespace-nowrap">
              {t("tagline")}
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 lg:justify-self-end">
            <a
              href={`mailto:${site.email}`}
              className="inline-flex max-w-full items-center gap-2 py-1 text-sm text-primary-foreground/90 transition-colors hover:text-gold focus-visible:outline-none focus-visible:text-gold focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-deep"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="break-all">{site.email}</span>
            </a>
            <div className="flex items-center gap-3" aria-label="Social media links">
              <a
                href={site.facebook}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className={SOCIAL_LINK}
              >
                <Facebook className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </a>
              <a
                href={site.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className={SOCIAL_LINK}
              >
                <Instagram className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </a>
              <a
                href={site.threads || THREADS_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Threads"
                className={SOCIAL_LINK}
              >
                <AtSign className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </a>
              <a
                href={site.tiktok || TIKTOK_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
                className={SOCIAL_LINK}
              >
                <Music2 className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </a>
              {site.linkedin && (
                <a
                  href={site.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className={SOCIAL_LINK}
                >
                  <Linkedin className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 px-4 py-3 text-xs sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-start gap-1.5">
            <p className="text-primary-foreground/80">
              © {new Date().getFullYear()} {t("footer.rights")}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link to="/privacy" className={LEGAL_LINK}>
                {t("footer.privacy")}
              </Link>
              <span aria-hidden="true" className="text-primary-foreground/40">
                |
              </span>
              <Link to="/terms" className={LEGAL_LINK}>
                {t("footer.terms")}
              </Link>
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex min-h-10 shrink-0 items-center gap-2 self-start rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-5 py-2 font-medium text-primary-foreground transition-colors hover:border-gold/60 hover:bg-gold hover:text-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-deep md:self-auto"
          >
            <Lock className="h-3 w-3" />
            {t("footer.portal")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
