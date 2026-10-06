import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/activities")({
  head: () => ({
    meta: [
      { title: "Hoạt động – The Mandarin League" },
      { name: "description", content: "Workshop, cuộc thi, webinar, trại hè và hoạt động cộng đồng." },
      { property: "og:title", content: "Hoạt động – The Mandarin League" },
      { property: "og:description", content: "Workshop, cuộc thi, webinar, trại hè và hoạt động cộng đồng." },
    ],
  }),
  component: PActivities,
});

function PActivities() {
  return <ComingSoon eyebrow="Hoạt động" title="Hoạt động của TML" desc="Workshop, cuộc thi, webinar, trại hè và hoạt động cộng đồng." />;
}
