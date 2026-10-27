import { createFileRoute } from "@tanstack/react-router";
import { TmlAiChat } from "@/components/ai/TmlAiChat";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/ai-tutor")({
  staticData: { sitemap: true },
  head: () => ({
    meta: pageMeta(
      "TML AI — Trợ lý hỏi đáp Liên Đoàn Hán Ngữ",
      "Hỏi đáp cùng 小龙 về Liên Đoàn Hán Ngữ dựa trên tài liệu công khai đã duyệt, kèm nguồn và ngày cập nhật. TML không lưu hội thoại.",
    ),
  }),
  component: TmlAiPage,
});

function TmlAiPage() {
  return <TmlAiChat />;
}
