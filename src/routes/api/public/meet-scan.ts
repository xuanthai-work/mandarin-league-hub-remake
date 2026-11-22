import { createFileRoute } from "@tanstack/react-router";
import { isValidCronAuth } from "@/lib/cron-auth";

export const Route = createFileRoute("/api/public/meet-scan")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        const authHeader = request.headers.get("authorization");

        if (!isValidCronAuth(authHeader, secret)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { scanBotConferences } = await import("@/lib/meet-auto.server");
          const results = await scanBotConferences({ limit: 10 });

          let scored = 0;
          let errors = 0;
          for (const r of results) {
            if (r.status === "scored") scored += 1;
            else if (r.status === "error") errors += 1;
          }

          return new Response(
            JSON.stringify({
              ok: true,
              processed: results.length,
              scored,
              errors,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch {
          return new Response(JSON.stringify({ error: "scan_failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
