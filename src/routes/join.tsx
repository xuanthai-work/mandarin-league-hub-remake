import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, Award, BookOpen, Briefcase, CalendarDays, HeartHandshake, Network, Rocket, School } from "lucide-react";
import { PageHero } from "@/components/site/SiteLayout";
import { SectionTitle } from "@/components/site/ui";
import { ApplicationForm } from "@/components/recruitment/ApplicationForm";
import { getDepartments } from "@/lib/data/departments";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/join")({
  head: () => ({ meta: pageMeta("Tuyển thành viên", "Ứng tuyển vào một trong 8 Ban của The Mandarin League.") }),
  component: PJoin,
});

const BENEFITS = [
  { icon: BookOpen, t: "Học hỏi" }, { icon: Rocket, t: "Phát triển kỹ năng" }, { icon: Briefcase, t: "Tham gia dự án" },
  { icon: CalendarDays, t: "Workshop" }, { icon: Network, t: "Networking" }, { icon: School, t: "Cơ hội giáo dục" },
  { icon: HeartHandshake, t: "Hoạt động cộng đồng" }, { icon: Award, t: "Chứng nhận khi đủ điều kiện" },
];

function PJoin() {
  return (
    <>
      <PageHero eyebrow="Tuyển thành viên" title="Tại sao tham gia TML?" desc="Vừa học tiếng Trung, vừa rèn kỹ năng và đóng góp cho cộng đồng." />
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 md:px-6">
        <a href="#apply" className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90">ỨNG TUYỂN VÀO TML <ArrowDown className="h-4 w-4" /></a>
        <section>
          <SectionTitle label="8 Ban" title="Chọn Ban phù hợp với bạn" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {getDepartments().map((d) => (
              <div key={d.id} className="rounded-2xl border border-border bg-card p-5"><div className="font-bold text-primary-deep">{d.name.replace("Ban ", "")}</div><div className="text-xs text-primary">{d.nameEn}</div><p className="mt-2 text-sm text-muted-foreground">{d.description}</p></div>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle label="Quyền lợi" title="Bạn nhận được gì" />
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {BENEFITS.map((b) => <div key={b.t} className="rounded-2xl bg-secondary p-5"><b.icon className="h-6 w-6 text-gold" /><div className="mt-3 font-medium">{b.t}</div></div>)}
          </div>
        </section>
        <section id="apply" className="mx-auto max-w-3xl scroll-mt-24">
          <SectionTitle label="Ứng tuyển" title="Đơn ứng tuyển thành viên TML" />
          <div className="mt-8"><ApplicationForm /></div>
        </section>
      </div>
    </>
  );
}
