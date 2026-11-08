import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { TERMS } from "@/lib/legal-docs";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  staticData: { sitemap: true },
  head: () => ({
    meta: pageMeta(
      "Điều khoản sử dụng",
      "Điều khoản khi sử dụng website và các cổng của The Mandarin League.",
    ),
  }),
  component: () => <LegalPage docs={TERMS} />,
});
