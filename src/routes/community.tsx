import { useTr } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, HandHeart, Megaphone, Sparkles, Users } from "lucide-react";
import { PageHero } from "@/components/site/SiteLayout";
import { BreadcrumbBar } from "@/components/site/PageBreadcrumb";
import { SectionTitle } from "@/components/site/ui";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/community")({
  staticData: { sitemap: true },
  head: () => ({
    meta: pageMeta(
      "Cộng đồng",
      "Thành viên, giáo viên, tình nguyện viên, mentor và đại sứ của The Mandarin League.",
    ),
  }),
  component: PCommunity,
});

const GROUPS: {
  icon: typeof Users;
  t: string;
  d: string;
  to?: "/organization" | "/teachers";
  actionText?: string;
}[] = [
  {
    icon: Users,
    t: "Thành viên",
    d: "Những người đang tham gia TML.",
    to: "/organization",
    actionText: "Xem cơ cấu tổ chức",
  },
  {
    icon: GraduationCap,
    t: "Giáo viên",
    d: "Đội ngũ giảng dạy và chuyên môn.",
    to: "/teachers",
    actionText: "Xem đội ngũ giảng viên",
  },
  { icon: HandHeart, t: "Tình nguyện viên", d: "Những người đóng góp cho hoạt động TML." },
  { icon: Sparkles, t: "Mentor", d: "Những người hỗ trợ học tập và phát triển." },
  { icon: Megaphone, t: "Đại sứ", d: "Những người đại diện và lan tỏa hoạt động TML." },
];
const OPPS = [
  "Khóa học",
  "Workshop",
  "Cuộc thi",
  "Học bổng",
  "Hoạt động",
  "Dự án",
  "Giao lưu",
  "Cơ hội hợp tác",
];

function PCommunity() {
  const tr = useTr();
  return (
    <>
      <BreadcrumbBar items={[{ label: "Giới thiệu" }, { label: "Cộng đồng TML" }]} />
      <PageHero
        eyebrow="Cộng đồng"
        title="Những con người của TML"
        desc="Cộng đồng học tập chính thức — nơi mỗi người cùng học, cùng đóng góp."
      />
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {GROUPS.map((g) => {
            const content = (
              <>
                <g.icon className="h-7 w-7 text-primary" />
                <div className="mt-4 font-bold text-primary-deep">{tr(g.t)}</div>
                <p className="mt-1 text-sm text-muted-foreground">{tr(g.d)}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                  {g.to ? (
                    <>
                      <span>{tr(g.actionText ?? "")}</span>
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                    </>
                  ) : (
                    <span className="font-normal text-muted-foreground">
                      {tr("Danh sách: Đang cập nhật")}
                    </span>
                  )}
                </div>
              </>
            );

            if (g.to)
              return (
                <Link
                  key={g.t}
                  to={g.to}
                  className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                >
                  {content}
                </Link>
              );

            return (
              <div
                key={g.t}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6"
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>
      <section className="bg-secondary py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionTitle label="Cơ hội" title="Cơ hội dành cho cộng đồng" />
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {OPPS.map((o) => (
              <div
                key={o}
                className="rounded-xl border border-border bg-card p-4 text-center font-medium"
              >
                {tr(o)}
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/join"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"
            >
              {tr("THAM GIA TML")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/courses/hsk"
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background px-6 py-3 font-semibold text-primary-deep transition hover:bg-accent"
            >
              {tr("Khám phá khóa học")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
