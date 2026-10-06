import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Tuyển thành viên – The Mandarin League" },
      { name: "description", content: "Cùng xây dựng cộng đồng học tiếng Trung trực tuyến." },
      { property: "og:title", content: "Tuyển thành viên – The Mandarin League" },
      { property: "og:description", content: "Cùng xây dựng cộng đồng học tiếng Trung trực tuyến." },
    ],
  }),
  component: PJoin,
});

function PJoin() {
  return <ComingSoon eyebrow="Tuyển thành viên" title="Gia nhập TML" desc="Cùng xây dựng cộng đồng học tiếng Trung trực tuyến." />;
}
