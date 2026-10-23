import { createFileRoute } from "@tanstack/react-router";
import { TmlAiChat } from "@/components/ai/TmlAiChat";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/ai-tutor")({
  staticData: { sitemap: true },
  head: () => ({
    meta: pageMeta(
      "TML AI — Học tiếng Trung & Hỗ trợ Liên Đoàn",
      "Trải nghiệm giao diện mẫu TML AI: học tiếng Trung HSK 1–6 và tìm thông tin công khai về Liên Đoàn Hán Ngữ. Chưa kết nối dịch vụ AI.",
    ),
  }),
  component: TmlAiPage,
});

function TmlAiPage() {
  return <TmlAiChat />;
}
