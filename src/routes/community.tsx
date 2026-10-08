import { useTr } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, HandHeart, Megaphone, Sparkles, Users } from "lucide-react";
import { PageHero } from "@/components/site/SiteLayout";
import { SectionTitle } from "@/components/site/ui";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/community")({ staticData: { sitemap: true },
  head: () => ({ meta: pageMeta("Cộng đồng", "Thành viên, giáo viên, tình nguyện viên, mentor và đại sứ của The Mandarin League.") }),
  component: PCommunity,
});

const GROUPS = [
  { icon: Users, t: "Thành viên", d: "Những người đang tham gia TML." },
  { icon: GraduationCap, t: "Giáo viên", d: "Đội ngũ giảng dạy và chuyên môn." },
  { icon: HandHeart, t: "Tình nguyện viên", d: "Những người đóng góp cho hoạt động TML." },
  { icon: Sparkles, t: "Mentor", d: "Những người hỗ trợ học tập và phát triển." },
  { icon: Megaphone, t: "Đại sứ", d: "Những người đại diện và lan tỏa hoạt động TML." },
];
const OPPS = ["Khóa học", "Workshop", "Cuộc thi", "Học bổng", "Hoạt động", "Dự án", "Giao lưu", "Cơ hội hợp tác"];

function PCommunity() {
  const tr = useTr();
  return (
    <>
      <PageHero eyebrow="Cộng đồng" title="Những con người của TML" desc="Cộng đồng học tập chính thức — nơi mỗi người cùng học, cùng đóng góp." />
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {GROUPS.map((g) => (
            <div key={g.t} className="rounded-2xl border border-border bg-card p-6">
              <g.icon className="h-7 w-7 text-primary" />
              <div className="mt-4 font-bold text-primary-deep">{tr(g.t)}</div>
              <p className="mt-1 text-sm text-muted-foreground">{tr(g.d)}</p>
              <div className="mt-4 text-xs font-medium text-muted-foreground">{tr("Danh sách: Đang cập nhật")}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-secondary py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionTitle label="Cơ hội" title="Cơ hội dành cho cộng đồng" />
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {OPPS.map((o) => <div key={o} className="rounded-xl border border-border bg-card p-4 text-center font-medium">{tr(o)}</div>)}
          </div>
          <Link to="/join" className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90">{tr("THAM GIA TML")} <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </>
  );
}
