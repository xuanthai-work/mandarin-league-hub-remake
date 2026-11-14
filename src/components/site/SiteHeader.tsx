import { useT } from "@/lib/i18n";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import logoClear from "@/assets/tml-logo-transparent.png";
import { SitePreferences } from "./SitePreferences";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSiteContent } from "@/lib/site-content";
import { HomeLink } from "./HomeLink";
import { useScrollSpy } from "@/lib/use-scroll-spy";
import { LANDING_NAV, type LandingNavItem } from "./site-nav";

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

export function Header() {
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
