import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Giới thiệu – The Mandarin League" },
      { name: "description", content: "Sứ mệnh, tầm nhìn và giá trị cốt lõi của TML." },
      { property: "og:title", content: "Giới thiệu – The Mandarin League" },
      { property: "og:description", content: "Sứ mệnh, tầm nhìn và giá trị cốt lõi của TML." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PAbout,
});

function PAbout() {
  return <ComingSoon eyebrow="Giới thiệu" title="Về The Mandarin League" desc="Sứ mệnh, tầm nhìn và giá trị cốt lõi của TML." />;
}
