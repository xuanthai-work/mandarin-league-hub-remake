import { createFileRoute } from "@tanstack/react-router";
import type { AnyRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import { getCourses } from "@/lib/data/courses";
import { getNews } from "@/lib/data/news";
import { getActivities } from "@/lib/data/activities";
import { isSitemapRouteIncluded, sitemapPathForLocation, sitemapStaticPaths, sitemapXML, type SitemapEntry } from "@/lib/sitemap";

const BASE_URL = "https://themandarinleague.bond";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));
        const dynamic: Array<[string, string, string, string[]]> = [
          ["/courses/hsk/$courseId", "/courses/hsk/$courseId", "courseId", getCourses().map((c) => c.id)],
          ["/news/$slug", "/news/$slug", "slug", getNews().map((n) => n.slug)],
          ["/activities/$activityId", "/activities/$activityId", "activityId", getActivities().map((a) => a.id)],
        ];
        for (const [routeId, to, param, values] of dynamic) {
          if (!isSitemapRouteIncluded((router.routesById as unknown as Record<string, AnyRoute>)[routeId])) continue;
          for (const value of values) {
            const location = router.buildLocation({ to, params: { [param]: value }, search: () => ({}), hash: "" } as never);
            const path = sitemapPathForLocation(router, location, routeId);
            if (path) entries.push({ path });
          }
        }
        if (entries.length === 0) {
          return new Response("No pages are included in this sitemap.", {
            status: 404,
            headers: { "Cache-Control": "no-store" },
          });
        }
        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
