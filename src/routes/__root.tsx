import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  useRouterState,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Toaster } from "@/components/ui/sonner";
import { GlobalLoadingScreen } from "@/components/site/GlobalLoadingScreen";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { domainRedirect, portalOf } from "@/lib/domain";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({ staticData: { sitemap: false },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "The Mandarin League | Liên Đoàn Hán Ngữ" },
      { name: "description", content: "Cộng đồng học tiếng Trung trực tuyến: khóa học HSK, workshop, cuộc thi và hoạt động cộng đồng." },
      { name: "author", content: "The Mandarin League" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@500;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const PORTAL_PREFIXES = ["/login", "/admin", "/member/dashboard", "/change-password", "/reset-password", "/auth"];

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const isPortal = PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  useEffect(() => {
    const to = domainRedirect(window.location.host, pathname, searchStr);
    if (to) window.location.replace(to);
    if (portalOf(window.location.host) === "member") {
      if (!document.querySelector('meta[name="robots"]')) {
        const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex, nofollow"; document.head.appendChild(m);
      }
      // PWA: manifest-only home-screen install for the member portal (no service worker).
      const addHead = (tag: string, attrs: Record<string, string>, key: string) => {
        if (document.head.querySelector(`${tag}[data-pwa="${key}"]`)) return;
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        el.setAttribute("data-pwa", key);
        document.head.appendChild(el);
      };
      addHead("link", { rel: "manifest", href: "/manifest.webmanifest" }, "manifest");
      addHead("link", { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }, "apple-icon");
      addHead("meta", { name: "theme-color", content: "#0F172A" }, "theme-color");
      addHead("meta", { name: "apple-mobile-web-app-capable", content: "yes" }, "apple-capable");
      addHead("meta", { name: "apple-mobile-web-app-title", content: "TML Member" }, "apple-title");
    }
  }, [pathname, searchStr]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      {isPortal ? (
        <div className="relative min-h-screen">
          {!pathname.startsWith("/admin/") && pathname !== "/admin" && !pathname.startsWith("/member") || pathname === "/admin/login" ? <Link to="/" className="absolute left-4 top-4 z-40 rounded-full border border-gold/40 bg-background/80 px-3 py-1.5 text-xs font-medium text-primary-deep backdrop-blur hover:bg-background">← Trở về Website TML</Link> : null}
          <Outlet />
        </div>
      ) : (
        <SiteLayout>
          <Outlet />
        </SiteLayout>
      )}
      <GlobalLoadingScreen />
      <Toaster richColors />
    </QueryClientProvider>
  );
}
