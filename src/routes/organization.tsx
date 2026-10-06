import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Cơ cấu tổ chức – The Mandarin League" },
      { name: "description", content: "Founder, Ban Điều hành và 7 Ban chuyên môn." },
      { property: "og:title", content: "Cơ cấu tổ chức – The Mandarin League" },
      { property: "og:description", content: "Founder, Ban Điều hành và 7 Ban chuyên môn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: POrganization,
});

function POrganization() {
  return <ComingSoon eyebrow="Cơ cấu tổ chức" title="Sơ đồ tổ chức TML" desc="Founder, Ban Điều hành và 7 Ban chuyên môn." />;
}
