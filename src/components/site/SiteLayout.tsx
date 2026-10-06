import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X, Mail, Facebook, Youtube, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/tml-logo.png.asset.json";

export const NAV = [
  { to: "/", label: "Trang chủ" },
  { to: "/about", label: "Giới thiệu" },
  { to: "/organization", label: "Cơ cấu tổ chức" },
  { to: "/courses/hsk", label: "Khóa học HSK" },
  { to: "/activities", label: "Hoạt động" },
  { to: "/verify", label: "Xác minh" },
  { to: "/join", label: "Tuyển thành viên" },
  { to: "/contact", label: "Liên hệ" },
] as const;

export const TAGLINE = "Connecting learners, educators & opportunities across Vietnam and China.";

const FOOTER_EXTRA = [
  { to: "/community", label: "Cộng đồng" },
  { to: "/partners", label: "Đối tác" },
  { to: "/news", label: "Tin tức" },
] as const;

export const CONTACT = {
  email: "community@themandarinleague.bond",
  facebook: "https://facebook.com",
  youtube: "https://youtube.com",
};

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto grid h-18 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 md:h-22 md:px-8 xl:flex xl:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img src={logo.url} alt="The Mandarin League" className="h-10 w-10 shrink-0 md:h-12 md:w-12" />
          <div className="min-w-0 leading-tight">
            <div className="text-xs font-bold text-primary-deep md:text-sm">THE MANDARIN LEAGUE</div>
            <div className="text-[11px] text-muted-foreground md:text-xs">Liên Đoàn Hán Ngữ · 普通话联盟</div>
          </div>
        </Link>
        <nav className="hidden shrink-0 items-center gap-0 xl:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="px-2.5 py-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "text-primary underline underline-offset-8" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Button asChild className="hidden shrink-0 xl:inline-flex"><Link to="/join">Tham gia TML</Link></Button>
        <Button variant="ghost" size="icon" className="shrink-0 xl:hidden" onClick={() => setOpen(!open)} aria-label={open ? "Đóng menu" : "Mở menu"} aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <nav className="border-t border-border bg-background px-5 py-3 xl:hidden">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: n.to === "/" }}
              className="block rounded-md px-3 py-2.5 text-sm font-medium"
              activeProps={{ className: "text-primary underline underline-offset-8" }}
            >
              {n.label}
            </Link>
          ))}
          <Link to="/join" onClick={() => setOpen(false)} className="mt-2 block rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
            Tham gia TML
          </Link>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-background text-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-background p-1"><img src={logo.url} alt="" className="h-12 w-12" /></div>
            <div>
              <div className="font-bold">THE MANDARIN LEAGUE</div>
              <div className="text-sm opacity-80">Liên Đoàn Hán Ngữ · 普通话联盟</div>
              <div className="text-xs opacity-70">Online Chinese Learning Community</div>
            </div>
          </div>
          <p className="mt-5 max-w-md text-sm leading-relaxed opacity-80">
            {TAGLINE}
          </p>
        </div>
        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-70">Khám phá</div>
          <ul className="space-y-2 text-sm">
            {[...NAV.slice(1), ...FOOTER_EXTRA].map((n) => (
              <li key={n.to}><Link to={n.to} className="opacity-85 hover:opacity-100 hover:underline">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider opacity-70">Liên hệ</div>
          <ul className="space-y-3 text-sm opacity-90">
            <li className="flex min-w-0 items-start gap-2"><Mail className="h-4 w-4 shrink-0" /><a href={`mailto:${CONTACT.email}`} className="min-w-0 break-all hover:underline">{CONTACT.email}</a></li>
            <li className="flex items-center gap-2"><Facebook className="h-4 w-4" /><a href={CONTACT.facebook} target="_blank" rel="noreferrer" className="hover:underline">Facebook</a></li>
            <li className="flex items-center gap-2"><Youtube className="h-4 w-4" /><a href={CONTACT.youtube} target="_blank" rel="noreferrer" className="hover:underline">YouTube</a></li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" />Hoạt động trực tuyến</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs opacity-70">
        © {new Date().getFullYear()} The Mandarin League – Liên Đoàn Hán Ngữ
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHero({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
        <div className="text-xs font-semibold uppercase text-muted-foreground">{eyebrow}</div>
        <h1 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">{title}</h1>
        {desc && <p className="mt-4 max-w-2xl text-muted-foreground">{desc}</p>}
      </div>
    </section>
  );
}

export function ComingSoon({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} desc={desc} />
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="rounded-2xl border border-dashed border-primary/40 bg-accent/40 p-10 text-center">
          <div className="font-han text-3xl text-primary">敬请期待</div>
          <p className="mt-2 text-muted-foreground">Trang này đang được xây dựng và sẽ ra mắt trong giai đoạn tiếp theo.</p>
        </div>
      </div>
    </>
  );
}
