import { createFileRoute } from "@tanstack/react-router";
import { VerificationLookup } from "@/components/verification/VerificationLookup";
import { useSiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/verify/certificate/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Xác minh chứng nhận – The Mandarin League" },
      {
        name: "description",
        content: "Nhập mã để kiểm tra trạng thái và thông tin chứng nhận TML.",
      },
      { property: "og:title", content: "Xác minh chứng nhận – The Mandarin League" },
      {
        property: "og:description",
        content: "Kiểm tra tính xác thực của chứng nhận do TML phát hành hoặc ghi nhận.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyCertificatePage,
});

function VerifyCertificatePage() {
  const h = useSiteContent("home").data;
  return (
    <VerificationLookup
      kind="certificate"
      title={h.verify_certificate_title}
      desc={h.verify_certificate_desc}
    />
  );
}
