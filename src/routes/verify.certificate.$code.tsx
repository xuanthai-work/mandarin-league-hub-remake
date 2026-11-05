import { createFileRoute } from "@tanstack/react-router";
import { VerificationLookup } from "@/components/verification/VerificationLookup";

export const Route = createFileRoute("/verify/certificate/$code")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Kết quả xác minh chứng nhận – The Mandarin League" },
      {
        name: "description",
        content: "Kết quả kiểm tra trạng thái chứng nhận TML từ đường dẫn xác minh.",
      },
      { property: "og:title", content: "Kết quả xác minh chứng nhận – The Mandarin League" },
      {
        property: "og:description",
        content: "Kiểm tra trạng thái chứng nhận TML bằng mã xác minh riêng.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    t: typeof s["t"] === "string" ? (s["t"] as string) : "",
  }),
  component: CertificateDirectResult,
});

function CertificateDirectResult() {
  const { code } = Route.useParams();
  const { t } = Route.useSearch();
  return <VerificationLookup kind="certificate" initialCode={code} initialToken={t ?? ""} />;
}
