import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { GOOGLE_USER_DATA_POLICY_URL, LIMITED_USE_STATEMENT, PRIVACY } from "@/lib/legal-docs";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () => ({
    meta: pageMeta(
      "Chính sách quyền riêng tư",
      "Cách The Mandarin League thu thập, sử dụng và bảo vệ thông tin, gồm dữ liệu từ Google.",
    ),
  }),
  component: () => <LegalPage docs={PRIVACY} extra={{ google: <LimitedUseBox /> }} />,
});

/** Google's required statement, verbatim in English, with the policy name linked. */
function LimitedUseBox() {
  const [before, after] = LIMITED_USE_STATEMENT.split("Google API Services User Data Policy");
  return (
    <div className="rounded-xl border border-border bg-secondary p-4 text-sm leading-relaxed">
      {before}
      <a
        href={GOOGLE_USER_DATA_POLICY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline-offset-2 hover:underline"
      >
        Google API Services User Data Policy
      </a>
      {after}
    </div>
  );
}
