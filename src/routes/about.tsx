import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Giới thiệu – The Mandarin League" },
      { name: "description", content: "Sứ mệnh, tầm nhìn và giá trị cốt lõi của TML." },
      { property: "og:title", content: "Giới thiệu – The Mandarin League" },
      { property: "og:description", content: "Sứ mệnh, tầm nhìn và giá trị cốt lõi của TML." },
    ],
  }),
  component: PAbout,
});

function PAbout() {
  return <ComingSoon eyebrow="Giới thiệu" title="Về The Mandarin League" desc="Sứ mệnh, tầm nhìn và giá trị cốt lõi của TML." />;
}
