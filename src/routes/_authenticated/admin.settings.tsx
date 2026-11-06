import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Eye, Globe, Palette, ServerCog, ShieldCheck, UserRound } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { HomeLink } from "@/components/site/HomeLink";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppearanceSection } from "@/components/admin/settings/AppearanceSection";
import { PrivacySection } from "@/components/admin/settings/PrivacySection";
import { ProfileSection } from "@/components/admin/settings/ProfileSection";
import { SecuritySection } from "@/components/admin/settings/SecuritySection";
import { SystemSection } from "@/components/admin/settings/SystemSection";
import { useMyAccount } from "@/components/admin/settings/shared";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Cài đặt | TML Admin" },
      { name: "description", content: "Tuỳ chỉnh giao diện khu vực quản trị The Mandarin League." },
      { property: "og:title", content: "Cài đặt – TML Admin" },
      { property: "og:description", content: "Tuỳ chỉnh giao diện khu vực quản trị TML." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  const me = useMyAccount();
  const [active, setActive] = useState("profile");
  const lockRef = useRef(0);
  const isAdmin = !!me.data?.roles.includes("admin");

  const items = me.isError
    ? [{ id: "appearance", label: "Giao diện", icon: Palette }]
    : [
        { id: "profile", label: "Hồ sơ", icon: UserRound },
        { id: "security", label: "Bảo mật", icon: ShieldCheck },
        { id: "appearance", label: "Giao diện", icon: Palette },
        ...(me.data?.member ? [{ id: "privacy", label: "Riêng tư", icon: Eye }] : []),
        ...(isAdmin ? [{ id: "system", label: "Hệ thống", icon: ServerCog }] : []),
      ];
  const itemsKey = items.map((i) => i.id).join(",");

  // Track the admin shell's scroll container; rerun once the sections exist after the account loads.
  useEffect(() => {
    const ids = itemsKey.split(",");
    const scroller = document.getElementById(ids[0]!)?.closest("main");
    if (!scroller) return;
    const onScroll = () => {
      if (Date.now() < lockRef.current) return; // a menu click is still scrolling
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
      if (atBottom) return setActive(ids[ids.length - 1]!);
      const line = scroller.getBoundingClientRect().top + 120;
      let current = ids[0]!;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [itemsKey, me.isLoading]);

  const jump = (id: string) => {
    lockRef.current = Date.now() + 800;
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-3 pb-10 sm:px-6 sm:pt-4">
      <AdminPageHeader
        title="Cài đặt"
        description="Tuỳ chỉnh trải nghiệm quản trị của bạn."
        actions={
          <HomeLink className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
            <Globe className="h-3.5 w-3.5" />
            <span>Trang chủ TML</span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
          </HomeLink>
        }
      />

      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
        <nav aria-label="Mục cài đặt" className="sticky top-2 hidden self-start space-y-1 lg:block">
          {items.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => jump(id)}
                aria-current={isActive ? "true" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-all duration-150 ${
                  isActive
                    ? "border border-border/80 bg-background font-semibold text-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                {label}
              </button>
            );
          })}
        </nav>

        <nav
          aria-label="Mục cài đặt"
          className="sticky top-0 z-10 -mx-4 mb-4 flex gap-1 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden"
        >
          {items.map(({ id, label }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => jump(id)}
                aria-current={isActive ? "true" : undefined}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-5">
          {me.isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)
          ) : me.isError ? (
            <>
              <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-xs">
                <p className="text-sm text-muted-foreground">Không tải được thông tin tài khoản.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => me.refetch()}
                >
                  Thử lại
                </Button>
              </div>
              <AppearanceSection />
            </>
          ) : me.data ? (
            <>
              <ProfileSection me={me.data} />
              <SecuritySection me={me.data} />
              <AppearanceSection />
              {me.data.member && <PrivacySection member={me.data.member} />}
              {isAdmin && <SystemSection />}
            </>
          ) : (
            <AppearanceSection />
          )}
        </div>
      </div>
    </section>
  );
}
