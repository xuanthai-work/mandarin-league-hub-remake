import { createFileRoute } from "@tanstack/react-router";

import { OrgChartSection } from "@/components/site/OrgChartSection";
import { BreadcrumbBar } from "@/components/site/PageBreadcrumb";
import { PageHero } from "@/components/site/SiteLayout";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/organization")({
  staticData: { sitemap: true },
  head: () => ({
    meta: pageMeta("Cơ cấu tổ chức", "Sơ đồ tổ chức TML: Ban Điều hành và 8 Ban chuyên môn."),
  }),
  component: POrganization,
});

function POrganization() {
  return (
    <>
      <BreadcrumbBar items={[{ label: "Giới thiệu" }, { label: "Cơ cấu tổ chức" }]} />
      <PageHero
        eyebrow="Cơ cấu tổ chức"
        title="Sơ đồ tổ chức TML"
        desc="The Mandarin League vận hành bởi Ban Điều hành và 8 Ban chuyên môn."
      />
      <OrgChartSection />
    </>
  );
}
