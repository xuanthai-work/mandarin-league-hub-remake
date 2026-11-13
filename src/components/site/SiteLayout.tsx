import { useTr as useTrHero } from "@/lib/i18n";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Menu,
  X,
  Mail,
  Facebook,
  Instagram,
  AtSign,
  MapPin,
  Lock,
  Music2,
  Linkedin,
  ChevronDown,
} from "lucide-react";
import logoClear from "@/assets/tml-logo-transparent.png";
import { useT } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n/dict";
import { SitePreferences } from "./SitePreferences";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CrystalParticles } from "./CrystalParticles";
import { useSiteContent, type HomeSectionKey } from "@/lib/site-content";
import { HomeLink } from "./HomeLink";
import { useScrollSpy } from "@/lib/use-scroll-spy";

export type NavChild = {
  to:
    | "/about"
    | "/community"
    | "/partners"
    | "/courses/hsk"
    | "/courses"
    | "/activities"
    | "/news"
    | "/verify/hsk"
    | "/verify/certificate"
    | "/verify";
  dict: DictKey;
};

export type NavPage = "/" | "/organization" | "/teachers" | "/contact";

export type LandingNavItem = {
  /** id of the landing `<section>` this link scrolls to. */
  id: string;
  label: string;
  dict: DictKey;
  /** When set, the item only shows while that home section is enabled in the CMS. */
  show?: HomeSectionKey;
  /** Independent pages reachable directly from this header item. */
  children?: NavChild[];
  /** Standalone page this item opens when the visitor is not on the landing page. */
  page?: NavPage;
};

export const LANDING_NAV: LandingNavItem[] = [
  { id: "hero", label: "Trang chủ", dict: "nav./", page: "/" },
  {
    id: "about",
    label: "Giới thiệu",
    dict: "nav./about",
    show: "about",
    children: [
      { to: "/about", dict: "nav.child.about" },
      { to: "/community", dict: "nav.child.community" },
      { to: "/partners", dict: "nav.child.partners" },
    ],
  },
  { id: "organization", label: "Cơ cấu tổ chức", dict: "nav./organization", page: "/organization" },
  {
    id: "courses",
    label: "Khóa học",
    dict: "nav./courses",
    show: "courses",
    children: [
      { to: "/courses/hsk", dict: "nav.child.hsk" },
      { to: "/courses", dict: "nav.child.courses" },
    ],
  },
  { id: "teachers", label: "Giảng viên", dict: "nav./teachers", page: "/teachers" },
  {
    id: "activities",
    label: "Hoạt động & Tin tức",
    dict: "nav.activitiesAndNews",
    show: "activities",
    children: [
      { to: "/activities", dict: "nav.child.activities" },
      { to: "/news", dict: "nav.child.news" },
    ],
  },
  {
    id: "verify",
    label: "Xác minh",
    dict: "nav./verify",
    children: [
      { to: "/verify/hsk", dict: "nav.child.verifyHsk" },
      { to: "/verify/certificate", dict: "nav.child.verifyCert" },
      { to: "/verify", dict: "nav.child.verifyCenter" },
    ],
  },
  { id: "contact", label: "Liên hệ", dict: "nav./contact", show: "cta", page: "/contact" },
];

// Items collapsed into the "More" menu on narrow desktop widths (1024–1279px).
const NAV_MORE: readonly string[] = ["teachers", "organization", "verify", "contact"];

/** Highlight for the section currently under the sticky header. */
const ACTIVE_LINK =
  "bg-primary/10 font-semibold text-primary ring-1 ring-primary/25 shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_30%,transparent)]";

const DESKTOP_ITEM =
  "whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors xl:px-2";
const DESKTOP_IDLE = "text-foreground/80 hover:bg-accent hover:text-accent-foreground";
const MOBILE_ITEM = "mt-1 block rounded-md px-3 py-2.5 text-sm font-medium transition-colors";
const MOBILE_IDLE = "text-foreground/85 hover:bg-accent";

export const CONTACT = {
  email: "community@themandarinleague.bond",
  facebook: "https://www.facebook.com/themandarinleague/",
  instagram: "https://www.instagram.com/liendoanhanngu?stkn=MXJzbXhkY3kyNDc2aw==",
};

function LandingLink({
  item,
  label,
  active,
  onHome,
  onNavigate,
  baseClassName,
  idleClassName,
}: {
  item: LandingNavItem;
  label: string;
  active: boolean;
  onHome: boolean;
  onNavigate: (id: string) => void;
  baseClassName: string;
  idleClassName: string;
}) {
  const cls = `${baseClassName} ${active ? ACTIVE_LINK : idleClassName}`;
  if (!onHome) {
    if (item.page)
      return (
        <Link to={item.page} onClick={() => onNavigate(item.id)} className={cls}>
          {label}
        </Link>
      );
    return (
      <Link
        to="/"
        hash={item.id}
        hashScrollIntoView={{ behavior: "smooth" }}
        onClick={() => onNavigate(item.id)}
        className={cls}
      >
        {label}
      </Link>
    );
  }
  return (
    <a
      href={item.id === "hero" ? "/" : `#${item.id}`}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(item.id);
      }}
      aria-current={active ? "true" : undefined}
      className={cls}
    >
      {label}
    </a>
  );
}

function DesktopNavItem({
  item,
  active,
  onHome,
  onNavigate,
}: {
  item: LandingNavItem;
  active: boolean;
  onHome: boolean;
  onNavigate: (id: string) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const show = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setOpen(true);
  };
  const hide = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 120);
  };
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const label = t(item.dict);
  const cls = `${DESKTOP_ITEM} ${active ? ACTIVE_LINK : DESKTOP_IDLE}`;
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <div onMouseEnter={show} onMouseLeave={hide} className="flex items-center">
        <DropdownMenuTrigger asChild>
          {onHome ? (
            <a
              href={item.id === "hero" ? "/" : `#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.id);
              }}
              aria-current={active ? "true" : undefined}
              className={cls}
            >
              {label}
            </a>
          ) : (
            <Link
              to="/"
              hash={item.id}
              hashScrollIntoView={{ behavior: "smooth" }}
              onClick={() => onNavigate(item.id)}
              className={cls}
            >
              {label}
            </Link>
          )}
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        align="start"
        className="min-w-56"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {item.children?.map((child) => (
          <DropdownMenuItem key={child.to} asChild>
            <Link to={child.to} className="flex w-full cursor-pointer">
              {t(child.dict)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNavItem({
  item,
  active,
  onHome,
  onNavigate,
  onClose,
}: {
  item: LandingNavItem;
  active: boolean;
  onHome: boolean;
  onNavigate: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const label = t(item.dict);
  if (!item.children)
    return (
      <LandingLink
        item={item}
        label={label}
        active={active}
        onHome={onHome}
        onNavigate={onNavigate}
        baseClassName={MOBILE_ITEM}
        idleClassName={MOBILE_IDLE}
      />
    );
  return (
    <div>
      <div className="mt-1 flex items-center">
        <LandingLink
          item={item}
          label={label}
          active={active}
          onHome={onHome}
          onNavigate={onNavigate}
          baseClassName="block flex-1 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
          idleClassName={MOBILE_IDLE}
        />
        <button
          type="button"
          aria-label={label}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-md p-2 text-foreground/70 transition hover:bg-accent"
        >
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="mb-1 ml-3 space-y-0.5 border-l border-border pl-3">
          {item.children.map((child) => (
            <Link
              key={child.to}
              to={child.to}
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              {t(child.dict)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const { t } = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onHome = pathname === "/";
  const { show } = useSiteContent("home").data;
  const items = LANDING_NAV.filter((n) => !n.show || show[n.show]);
  const activeId = useScrollSpy(onHome ? items.map((n) => n.id) : [], 100);
  const moreActive = onHome && !!activeId && NAV_MORE.includes(activeId);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navigate = (id: string) => {
    setOpen(false);
    if (!onHome) return;
    window.history.replaceState(
      null,
      "",
      id === "hero" ? `${window.location.pathname}${window.location.search}` : `#${id}`,
    );
    // The mobile drawer sits inside the sticky header, so wait for it to close
    // (and the page to reflow) before measuring the target position.
    if (open) requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(id)));
    else scrollTo(id);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 md:h-20 md:px-5">
        <HomeLink className="flex shrink-0 items-center gap-3">
          <img
            src={logoClear}
            alt="The Mandarin League"
            className="h-10 w-10 shrink-0 object-contain md:h-12 md:w-12"
          />
          <div className="min-w-0 leading-tight">
            <div className="whitespace-nowrap text-sm font-bold tracking-normal text-primary-deep dark:text-foreground">
              THE MANDARIN LEAGUE
            </div>
            <div className="hidden truncate text-[11px] text-muted-foreground dark:text-gold/80 md:block md:text-xs lg:hidden xl:block">
              {t("brand.sub")}
            </div>
          </div>
        </HomeLink>
        <nav className="mx-auto hidden flex-1 items-center justify-center gap-1.5 pl-6 pr-3 lg:flex xl:gap-1.5">
          {items.map((n) =>
            n.children ? (
              <div key={n.id} className="contents">
                <span className="xl:hidden">
                  <LandingLink
                    item={n}
                    label={t(n.dict)}
                    active={onHome && activeId === n.id}
                    onHome={onHome}
                    onNavigate={navigate}
                    baseClassName={`${DESKTOP_ITEM}${NAV_MORE.includes(n.id) ? " hidden xl:inline-flex" : ""}`}
                    idleClassName={DESKTOP_IDLE}
                  />
                </span>
                <span className="hidden xl:flex">
                  <DesktopNavItem
                    item={n}
                    active={onHome && activeId === n.id}
                    onHome={onHome}
                    onNavigate={navigate}
                  />
                </span>
              </div>
            ) : (
              <LandingLink
                key={n.id}
                item={n}
                label={t(n.dict)}
                active={onHome && activeId === n.id}
                onHome={onHome}
                onNavigate={navigate}
                baseClassName={`${DESKTOP_ITEM}${NAV_MORE.includes(n.id) ? " hidden xl:inline-flex" : ""}`}
                idleClassName={DESKTOP_IDLE}
              />
            ),
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                moreActive
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
              } xl:hidden`}
            >
              {t("nav.more")} <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              {items
                .filter((n) => NAV_MORE.includes(n.id))
                .map((n) =>
                  onHome ? (
                    <DropdownMenuItem
                      key={n.id}
                      onSelect={() => navigate(n.id)}
                      className={activeId === n.id ? "font-semibold text-primary" : undefined}
                    >
                      {t(n.dict)}
                    </DropdownMenuItem>
                  ) : n.page ? (
                    <DropdownMenuItem key={n.id} asChild>
                      <Link to={n.page} onClick={() => setOpen(false)} className="flex w-full">
                        {t(n.dict)}
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem key={n.id} asChild>
                      <Link
                        to="/"
                        hash={n.id}
                        hashScrollIntoView={{ behavior: "smooth" }}
                        onClick={() => setOpen(false)}
                        className="flex w-full"
                      >
                        {t(n.dict)}
                      </Link>
                    </DropdownMenuItem>
                  ),
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <SitePreferences />
          <Link
            to="/join"
            className="whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 xl:py-2.5"
          >
            {t("cta.join")}
          </Link>
        </div>
        <button
          className="shrink-0 rounded-md p-2 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label={t("menu.open")}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border bg-background px-4 py-3 lg:hidden">
          <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">{t("pref.settings")}</span>
            <SitePreferences />
          </div>
          {items.map((n) => (
            <MobileNavItem
              key={n.id}
              item={n}
              active={onHome && activeId === n.id}
              onHome={onHome}
              onNavigate={navigate}
              onClose={() => setOpen(false)}
            />
          ))}
          <Link
            to="/join"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
          >
            {t("cta.join")}
          </Link>
          <Link
            to="/ai-tutor"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-md border border-gold/40 px-3 py-2.5 text-sm font-medium text-primary-deep dark:text-foreground"
          >
            TML AI
          </Link>
        </nav>
      )}
    </header>
  );
}

function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-70">{children}</div>
  );
}

const FOOT_LINK =
  "inline-flex items-center gap-2 opacity-85 transition hover:text-gold hover:opacity-100";

function Footer() {
  const { t } = useT();
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
              <div className="text-sm opacity-80">Liên Đoàn Hán Ngữ · 普通话联盟</div>
              <div className="text-xs opacity-70">Online Chinese Learning Community</div>
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
  const tr = useTrHero();
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
