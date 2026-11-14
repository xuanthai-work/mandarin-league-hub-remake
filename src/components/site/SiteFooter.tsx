import { useT, useTr } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Mail, Facebook, Instagram, AtSign, Music2, Linkedin, MapPin, Lock } from "lucide-react";
import { useSiteContent } from "@/lib/site-content";

function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-70">{children}</div>
  );
}

const FOOT_LINK =
  "inline-flex items-center gap-2 opacity-85 transition hover:text-gold hover:opacity-100";

export function Footer() {
  const { t } = useT();
  const tr = useTr();
  const site = useSiteContent("site").data;
  return (
    <footer className="mt-24 bg-primary-deep text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 md:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        {/* Brand, contact & copyright */}
        <div className="md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-background p-1">
              <img src="/logo.svg" alt="" className="h-12 w-12 rounded-full object-cover" />
            </div>
            <div>
              <div className="font-bold">THE MANDARIN LEAGUE</div>
              <div className="text-sm opacity-80">{t("brand.sub")}</div>
              <div className="text-xs opacity-70">{tr("Online Chinese Learning Community")}</div>
            </div>
          </div>
          <p className="mt-5 max-w-md text-sm leading-relaxed opacity-80">
            {site.tagline || t("tagline")}
          </p>
          <a
            href={`mailto:${site.email}`}
            className="mt-4 inline-flex items-center gap-2 text-sm opacity-85 transition hover:text-gold hover:opacity-100"
          >
            <Mail className="h-4 w-4 shrink-0" />
            {site.email}
          </a>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm opacity-85">
            <a
              href={site.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="rounded-full p-1 transition hover:text-gold"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href={site.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="rounded-full p-1 transition hover:text-gold"
            >
              <Instagram className="h-4 w-4" />
            </a>
            {site.threads && (
              <a
                href={site.threads}
                target="_blank"
                rel="noreferrer"
                aria-label="Threads"
                className="rounded-full p-1 transition hover:text-gold"
              >
                <AtSign className="h-4 w-4" />
              </a>
            )}
            {site.tiktok && (
              <a
                href={site.tiktok}
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
                className="rounded-full p-1 transition hover:text-gold"
              >
                <Music2 className="h-4 w-4" />
              </a>
            )}
            {site.linkedin && (
              <a
                href={site.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="rounded-full p-1 transition hover:text-gold"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs opacity-70">
              <MapPin className="h-3.5 w-3.5" />
              {t("footer.online")}
            </span>
          </div>
          <p className="mt-5 text-xs opacity-55">
            © {new Date().getFullYear()} {site.footer_note || t("footer.rights")}
          </p>
        </div>

        {/* About TML */}
        <div>
          <FooterHeading>{t("footer.aboutTml")}</FooterHeading>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link to="/about" className={FOOT_LINK}>
                {t("nav./about")}
              </Link>
            </li>
            <li>
              <Link to="/organization" className={FOOT_LINK}>
                {t("nav./organization")}
              </Link>
            </li>
            <li>
              <Link to="/community" className={FOOT_LINK}>
                {t("footer.communityTml")}
              </Link>
            </li>
            <li>
              <Link to="/partners" className={FOOT_LINK}>
                {t("footer.partners")}
              </Link>
            </li>
            <li>
              <Link to="/contact" className={FOOT_LINK}>
                {t("nav./contact")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Training & activities */}
        <div>
          <FooterHeading>{t("footer.training")}</FooterHeading>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link to="/courses/hsk" className={FOOT_LINK}>
                {t("footer.hskCourses")}
              </Link>
            </li>
            <li>
              <Link to="/teachers" className={FOOT_LINK}>
                {t("nav./teachers")}
              </Link>
            </li>
            <li>
              <Link to="/activities" className={FOOT_LINK}>
                {t("nav./activities")}
              </Link>
            </li>
            <li>
              <Link to="/news" className={FOOT_LINK}>
                {t("nav./news")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Utilities & verification */}
        <div>
          <FooterHeading>{t("footer.utilities")}</FooterHeading>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link to="/verify/hsk" className={FOOT_LINK}>
                {t("footer.hskLookup")}
              </Link>
            </li>
            <li>
              <Link to="/verify/certificate" className={FOOT_LINK}>
                {t("footer.verifyCert")}
              </Link>
            </li>
            <li>
              <Link to="/ai-tutor" className={FOOT_LINK}>
                {t("footer.aiTutor")}
              </Link>
            </li>
            <li>
              <Link to="/library-access" className={FOOT_LINK}>
                {t("footer.libraryAccess")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-6 text-center text-xs sm:flex-row sm:justify-between sm:text-left">
          <div className="space-y-1">
            <p className="opacity-55">{t("footer.tagline")}</p>
            <p className="flex flex-wrap justify-center gap-x-3 sm:justify-start">
              <Link
                to="/privacy"
                className="opacity-70 underline-offset-2 hover:opacity-100 hover:underline"
              >
                {t("footer.privacy")}
              </Link>
              <Link
                to="/terms"
                className="opacity-70 underline-offset-2 hover:opacity-100 hover:underline"
              >
                {t("footer.terms")}
              </Link>
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-4 py-1.5 font-medium opacity-85 transition hover:bg-primary-foreground/15 hover:opacity-100"
          >
            <Lock className="h-3 w-3" />
            {t("footer.portal")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
