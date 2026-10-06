import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Liên hệ – The Mandarin League" },
      { name: "description", content: "Email, mạng xã hội và biểu mẫu liên hệ." },
      { property: "og:title", content: "Liên hệ – The Mandarin League" },
      { property: "og:description", content: "Email, mạng xã hội và biểu mẫu liên hệ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PContact,
});

function PContact() {
  return <ComingSoon eyebrow="Liên hệ" title="Liên hệ với TML" desc="Email, mạng xã hội và biểu mẫu liên hệ." />;
}
