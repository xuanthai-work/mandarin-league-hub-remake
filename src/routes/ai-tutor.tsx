import { createFileRoute } from "@tanstack/react-router";
import { TmlAiChat } from "@/components/ai/TmlAiChat";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/ai-tutor")({
  staticData: { sitemap: true },
  head: () => ({
    meta: pageMeta(
      "TML AI — Học tiếng Trung & Hỗ trợ Liên Đoàn",
      "Học tiếng Trung HSK 1–6 cùng 小龙 qua Gemini và tra cứu tài liệu công khai đã duyệt của Liên Đoàn Hán Ngữ. TML không lưu hội thoại.",
    ),
  }),
  component: TmlAiPage,
});

function TmlAiPage() {
  return <TmlAiChat />;
}
