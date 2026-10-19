import { useTr as useTrHero } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X, Mail, Facebook, Instagram, AtSign, MapPin, Lock, Music2, Linkedin } from "lucide-react";
import logo from "@/assets/tml-logo.png.asset.json";
import logoClear from "@/assets/tml-logo-transparent.png";
import { useT } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n/dict";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { CrystalParticles } from "./CrystalParticles";
import { useSiteContent } from "@/lib/site-content";

export const NAV = [
  { to: "/", label: "Trang chủ" },
  { to: "/about", label: "Giới thiệu" },
  { to: "/organization", label: "Cơ cấu tổ chức" },
  { to: "/courses", label: "Khóa học" },
  { to: "/teachers", label: "Giảng viên" },
  { to: "/activities", label: "Hoạt động" },
  { to: "/verify", label: "Xác minh" },
  { to: "/contact", label: "Liên hệ" },
] as const;

export const TAGLINE = "Connecting learners, educators & opportunities across Vietnam and China.";

const FOOTER_EXTRA = [
  { to: "/join", label: "Tuyển thành viên" },
  { to: "/community", label: "Cộng đồng" },
  { to: "/partners", label: "Đối tác" },
  { to: "/news", label: "Tin tức" },
] as const;

export const CONTACT = {
  email: "community@themandarinleague.bond",
  facebook: "https://www.facebook.com/themandarinleague/",
  instagram: "https://www.instagram.com/liendoanhanngu?stkn=MXJzbXhkY3kyNDc2aw==",
};

function Header() {
  const [open, setOpen] = useState(false);
  const { t } = useT();
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 md:h-20 md:px-5">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img src={logoClear} alt="The Mandarin League" className="h-10 w-10 shrink-0 object-contain md:h-12 md:w-12" />
          <div className="min-w-0 leading-tight">
            <div className="whitespace-nowrap text-sm font-bold tracking-normal text-primary-deep dark:text-foreground md:text-base">THE MANDARIN LEAGUE</div>
            <div className="truncate text-[11px] text-muted-foreground dark:text-gold/80 md:text-xs">{t("brand.sub")}</div>
          </div>
        </Link>
        <nav className="hidden min-w-0 items-center gap-0.5 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="whitespace-nowrap rounded-md px-2 py-2 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground xl:px-2.5 xl:text-sm"
              activeProps={{ className: "text-primary bg-accent" }}
            >
              {t(`nav.${n.to}` as DictKey)}
            </Link>
          ))}
        </nav>
        <div className="hidden shrink-0 items-center gap-1 lg:flex"><LanguageSwitcher /><ThemeToggle /></div>
        <Link
          to="/join"
          className="hidden whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 xl:px-5 xl:py-2.5 lg:inline-flex"
        >
          {t("cta.join")}
        </Link>
        <button className="shrink-0 rounded-md p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label={t("menu.open")}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-border bg-background px-4 py-3 lg:hidden">
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: n.to === "/" }}
              className="block rounded-md px-3 py-2.5 text-sm font-medium"
              activeProps={{ className: "text-primary bg-accent" }}
            >
              {t(`nav.${n.to}` as DictKey)}
            </Link>
          ))}
          <Link to="/join" onClick={() => setOpen(false)} className="mt-2 block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
            {t("cta.join")}
          </Link>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const { t } = useT();
  const site = useSiteContent("site").data;
  return (
    <footer className="mt-24 bg-primary-deep text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-background p-1"><img src={logo.url} alt="" className="h-12 w-12 rounded-full object-cover" /></div>
            <div>
              <div className="font-bold">THE MANDARIN LEAGUE</div>
              <div className="text-sm opacity-80">Liên Đoàn Hán Ngữ · 普通话联盟</div>
              <div className="text-xs opacity-70">Online Chinese Learning Community</div>
            </div>
          </div>
          <p className="mt-5 max-w-md text-sm leading-relaxed opacity-80">
            {site.tagline || t("tagline")}
          </p>
        </div>
        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-70">{t("footer.explore")}</div>
          <ul className="space-y-2 text-sm">
            {[...NAV.slice(1), ...FOOTER_EXTRA].map((n) => (
              <li key={n.to}><Link to={n.to} className="opacity-85 hover:opacity-100 hover:underline">{t(`nav.${n.to}` as DictKey)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-70">{t("footer.contact")}</div>
          <ul className="space-y-3 text-sm opacity-90">
            <li className="flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0" /><a href={`mailto:${site.email}`} className="break-all hover:underline">{site.email}</a></li>
            <li className="flex items-center gap-2"><Facebook className="h-4 w-4" /><a href={site.facebook} target="_blank" rel="noreferrer" className="hover:underline">Facebook</a></li>
            <li className="flex items-center gap-2"><Instagram className="h-4 w-4" /><a href={site.instagram} target="_blank" rel="noreferrer" className="hover:underline">Instagram</a></li>
            {site.threads && <li className="flex items-center gap-2"><AtSign className="h-4 w-4" /><a href={site.threads} target="_blank" rel="noreferrer" className="hover:underline">Threads</a></li>}
            {site.tiktok && <li className="flex items-center gap-2"><Music2 className="h-4 w-4" /><a href={site.tiktok} target="_blank" rel="noreferrer" className="hover:underline">TikTok</a></li>}
            {site.linkedin && <li className="flex items-center gap-2"><Linkedin className="h-4 w-4" /><a href={site.linkedin} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a></li>}
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" />{t("footer.online")}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-6 text-center text-xs sm:flex-row sm:justify-between sm:text-left">
          <div className="space-y-1">
            <p className="opacity-80">© {new Date().getFullYear()} {site.footer_note || t("footer.rights")}</p>
            <p className="opacity-55">{t("footer.tagline")}</p>
          </div>
          <Link to="/login" className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-4 py-1.5 font-medium opacity-85 transition hover:bg-primary-foreground/15 hover:opacity-100"><Lock className="h-3 w-3" />{t("footer.portal")}</Link>
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

export function PageHero({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  const tr = useTrHero();
  return (
    <section className="grid-lines border-b border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="text-sm font-semibold uppercase tracking-widest text-primary">{tr(eyebrow)}</div>
        <h1 className="mt-3 text-3xl font-bold text-primary-deep md:text-5xl">{tr(title)}</h1>
        {desc && <p className="mt-4 max-w-2xl text-muted-foreground">{tr(desc)}</p>}
      </div>
    </section>
  );
}

export function ComingSoon({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  const { t } = useT();
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} desc={desc} />
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="rounded-2xl border border-dashed border-primary/40 bg-accent/40 p-10 text-center">
          <div className="font-han text-3xl text-primary">敬请期待</div>
          <p className="mt-2 text-muted-foreground">{t("soon.text")}</p>
        </div>
      </div>
    </>
  );
}
