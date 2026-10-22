import { useTr } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Globe2, HeartHandshake, Sparkles, Target, Telescope, Users, GraduationCap } from "lucide-react";
import { PageHero } from "@/components/site/SiteLayout";
import { SectionTitle } from "@/components/site/ui";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/about")({ staticData: { sitemap: true },
  head: () => ({ meta: pageMeta("Giới thiệu", "TML – cộng đồng giáo dục tiếng Trung trực tuyến kết nối người học Việt Nam và Trung Quốc.") }),
  component: PAbout,
});

const VALUES = [
  { icon: BookOpen, t: "Học tập", d: "Học bài bản, thực chất." },
  { icon: Users, t: "Cộng đồng", d: "Cùng nhau tiến bộ." },
  { icon: Sparkles, t: "Sáng tạo", d: "Đổi mới cách học." },
  { icon: HeartHandshake, t: "Trách nhiệm", d: "Minh bạch, tận tâm." },
];

const STEPS = ["Học tập qua khóa HSK online", "Trải nghiệm qua workshop, cuộc thi", "Đóng góp trong 8 Ban chuyên môn", "Kết nối cơ hội Việt Nam – Trung Quốc"];
const PROGRAMS = ["Khóa học HSK 1–6", "Workshop & Webinar", "Cuộc thi tiếng Trung", "Giao lưu Việt – Trung", "Podcast", "Dự án cộng đồng"];

function PAbout() {
  const tr = useTr();
  return (
    <>
      <PageHero eyebrow="Giới thiệu" title="The Mandarin League" desc="Liên Đoàn Hán Ngữ · 普通话联盟 — Online Chinese Learning Community." />
      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 md:px-6">
        <section className="grid gap-8 md:grid-cols-2">
          <SectionTitle label="01 · TML là gì?" title="Cộng đồng giáo dục tiếng Trung trực tuyến" />
          <p className="text-muted-foreground">{tr("TML là tổ chức cộng đồng dành cho thanh niên yêu tiếng Trung và văn hóa Trung Hoa, kết nối người học, giáo viên và cơ hội giữa Việt Nam và Trung Quốc.")}</p>
        </section>
        <section className="grid gap-5 md:grid-cols-2">
          {[{ icon: Target, l: "02 · Sứ mệnh", d: "Giúp người Việt học tiếng Trung hiệu quả, dễ tiếp cận và giàu trải nghiệm." },
            { icon: Telescope, l: "03 · Tầm nhìn", d: "Trở thành cộng đồng học tiếng Trung trực tuyến uy tín, cầu nối giáo dục Việt – Trung." }].map((x) => (
            <div key={x.l} className="rounded-2xl border border-border bg-card p-8">
              <x.icon className="h-7 w-7 text-primary" />
              <div className="mt-4 text-sm font-semibold uppercase tracking-widest text-primary">{tr(x.l)}</div>
              <p className="mt-2 text-lg text-foreground">{tr(x.d)}</p>
            </div>
          ))}
        </section>
        <section>
          <SectionTitle label="04 · Giá trị cốt lõi" title="Điều chúng tôi theo đuổi" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <div key={v.t} className="rounded-2xl border border-border bg-card p-6"><v.icon className="h-6 w-6 text-gold" /><div className="mt-3 font-bold text-primary-deep">{tr(v.t)}</div><div className="text-sm text-muted-foreground">{tr(v.d)}</div></div>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle label="05 · Cách hoạt động" title="TML hoạt động như thế nào?" />
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s} className="relative rounded-2xl bg-secondary p-6"><div className="text-3xl font-extrabold text-primary/40">0{i + 1}</div><div className="mt-2 font-medium">{tr(s)}</div></li>
            ))}
          </ol>
        </section>
        <section>
          <SectionTitle label="06 · Chương trình" title="Các chương trình chính" />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROGRAMS.map((p) => <div key={p} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"><GraduationCap className="h-5 w-5 text-primary" />{tr(p)}</div>)}
          </div>
        </section>
        <section className="grid gap-5 md:grid-cols-2">
          <Link to="/organization" className="group rounded-2xl bg-brand-gradient p-8 text-primary-foreground">
            <div className="text-sm font-semibold uppercase tracking-widest opacity-80">{tr("07 · Cơ cấu tổ chức")}</div>
            <div className="mt-2 text-xl font-bold">{tr("Ban Điều hành & 8 Ban chuyên môn")}</div>
            <span className="mt-4 inline-flex items-center gap-1 font-semibold">{tr("Xem sơ đồ")} <ArrowRight className="h-4 w-4" /></span>
          </Link>
          <Link to="/partners" className="group rounded-2xl border border-border bg-card p-8">
            <Globe2 className="h-6 w-6 text-brand-red" />
            <div className="mt-2 text-sm font-semibold uppercase tracking-widest text-primary">{tr("08 · Đối tác & cơ hội")}</div>
            <div className="mt-2 text-xl font-bold text-primary-deep">{tr("Cùng TML mở rộng cơ hội học tập")}</div>
            <span className="mt-4 inline-flex items-center gap-1 font-semibold text-primary">{tr("Tìm hiểu")} <ArrowRight className="h-4 w-4" /></span>
          </Link>
        </section>
      </div>
    </>
  );
}
