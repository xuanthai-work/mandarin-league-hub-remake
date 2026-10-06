import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/courses/hsk/")({
  head: () => ({
    meta: [
      { title: "Khóa học HSK – The Mandarin League" },
      { name: "description", content: "Lộ trình HSK bài bản cùng đội ngũ giáo viên TML." },
      { property: "og:title", content: "Khóa học HSK – The Mandarin League" },
      { property: "og:description", content: "Lộ trình HSK bài bản cùng đội ngũ giáo viên TML." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PCourseshsk,
});

function PCourseshsk() {
  return <ComingSoon eyebrow="Khóa học HSK" title="Khóa học HSK 1–6" desc="Lộ trình HSK bài bản cùng đội ngũ giáo viên TML." />;
}
