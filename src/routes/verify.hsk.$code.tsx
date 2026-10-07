import { createFileRoute } from "@tanstack/react-router";
import { VerificationLookup } from "@/components/verification/VerificationLookup";

export const Route = createFileRoute("/verify/hsk/$code")({ staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Kết quả xác minh HSK – The Mandarin League" },
      { name: "description", content: "Kết quả HSK được ghi nhận trong hệ thống TML từ đường dẫn xác minh." },
      { property: "og:title", content: "Kết quả xác minh HSK – The Mandarin League" },
      { property: "og:description", content: "Kiểm tra kết quả HSK bằng mã xác minh riêng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HskDirectResult,
});

function HskDirectResult() {
  const { code } = Route.useParams();
  return <VerificationLookup kind="hsk" initialCode={code} />;
}