import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Check, Globe, Moon, Sun } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { HomeLink } from "@/components/site/HomeLink";
import { setTheme, useTheme, type Theme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/admin/settings")({ staticData: { sitemap: false },
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

const THEMES: { value: Theme; label: string; desc: string; icon: typeof Sun }[] = [
  { value: "light", label: "Chế độ sáng", desc: "Nền trắng, chữ xanh đậm — giao diện mặc định.", icon: Sun },
  { value: "dark", label: "Chế độ tối", desc: "Nền navy đậm, chữ sáng, giữ tông xanh thương hiệu TML.", icon: Moon },
];

function AdminSettings() {
  const theme = useTheme();
  return (
    <section className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
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

      <div className="max-w-3xl">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <h2 className="font-semibold text-foreground">Giao diện</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lựa chọn được lưu trên thiết bị này và áp dụng cho toàn bộ khu vực quản trị.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {THEMES.map(({ value, label, desc, icon: Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTheme(value)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                    active
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent/40 hover:shadow-xs"
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-muted text-primary"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      {label}
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
