import { createFileRoute } from "@tanstack/react-router";
import { VerificationLookup } from "@/components/verification/VerificationLookup";
import { useSiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/verify/hsk/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Xác minh kết quả HSK – The Mandarin League" },
      {
        name: "description",
        content: "Nhập mã để kiểm tra kết quả HSK được ghi nhận trong hệ thống TML.",
      },
      { property: "og:title", content: "Xác minh kết quả HSK – The Mandarin League" },
      {
        property: "og:description",
        content: "Kiểm tra kết quả HSK được TML ghi nhận hoặc xác minh trong hệ thống.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyHskPage,
});

function VerifyHskPage() {
  const h = useSiteContent("home").data;
  return <VerificationLookup kind="hsk" title={h.verify_hsk_title} desc={h.verify_hsk_desc} />;
}
