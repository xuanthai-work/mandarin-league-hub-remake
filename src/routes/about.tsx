import { useTr } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Globe2,
  HeartHandshake,
  Sparkles,
  Target,
  Telescope,
  Users,
  GraduationCap,
} from "lucide-react";
import { PageHero } from "@/components/site/SiteLayout";
import { BreadcrumbBar } from "@/components/site/PageBreadcrumb";
import { SectionTitle } from "@/components/site/ui";
import { pageMeta } from "@/lib/seo";
import { useSiteContent, type HomeTextFieldKey } from "@/lib/site-content";

export const Route = createFileRoute("/about")({
  staticData: { sitemap: true },
  head: () => ({
    meta: pageMeta(
      "Giới thiệu",
      "TML – cộng đồng giáo dục tiếng Trung trực tuyến kết nối người học Việt Nam và Trung Quốc.",
    ),
  }),
  component: PAbout,
});

/** 4 giá trị dùng chung nội dung với khối “Giá trị cốt lõi” trên trang chủ. */
const VALUES: {
  icon: typeof Users;
  t: string;
  d: string;
  titleKey: HomeTextFieldKey;
  descKey: HomeTextFieldKey;
}[] = [
  {
    icon: BookOpen,
    t: "Học tập",
    d: "Học bài bản, thực chất.",
    titleKey: "value1_title",
    descKey: "value1_desc",
  },
  {
    icon: Users,
    t: "Cộng đồng",
    d: "Cùng nhau tiến bộ.",
    titleKey: "value2_title",
    descKey: "value2_desc",
  },
  {
    icon: Sparkles,
    t: "Sáng tạo",
    d: "Đổi mới cách học.",
    titleKey: "value3_title",
    descKey: "value3_desc",
  },
  {
    icon: HeartHandshake,
    t: "Trách nhiệm",
    d: "Minh bạch, tận tâm.",
    titleKey: "value4_title",
    descKey: "value4_desc",
  },
];

const STEPS = [
  "Học tập qua khóa HSK online",
  "Trải nghiệm qua workshop, cuộc thi",
  "Đóng góp trong 8 Ban chuyên môn",
  "Kết nối cơ hội Việt Nam – Trung Quốc",
];
const PROGRAMS = [
  "Khóa học HSK 1–6",
  "Workshop & Webinar",
  "Cuộc thi tiếng Trung",
  "Giao lưu Việt – Trung",
  "Podcast",
  "Dự án cộng đồng",
];

function PAbout() {
  const tr = useTr();
  const h = useSiteContent("home").data;
  return (
    <>
      <BreadcrumbBar items={[{ label: "Giới thiệu" }, { label: "Về TML" }]} />
      <PageHero
        eyebrow="Giới thiệu"
        title="The Mandarin League"
        desc="Liên Đoàn Hán Ngữ · 普通话联盟 — Online Chinese Learning Community."
      />
      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 md:px-6">
        <section className="grid gap-8 md:grid-cols-2">
          <SectionTitle
            label={tr("01 · TML là gì?")}
            title={h.about_page_intro_title || tr("Cộng đồng giáo dục tiếng Trung trực tuyến")}
          />
          <p className="text-muted-foreground">
            {h.about_page_intro_body ||
              tr(
                "TML là tổ chức cộng đồng dành cho thanh niên yêu tiếng Trung và văn hóa Trung Hoa, kết nối người học, giáo viên và cơ hội giữa Việt Nam và Trung Quốc.",
              )}
          </p>
        </section>
        <section className="grid gap-5 md:grid-cols-2">
          {[
            {
              icon: Target,
              l: "02 · Sứ mệnh",
              d:
                h.about_page_mission ||
                "Giúp người Việt học tiếng Trung hiệu quả, dễ tiếp cận và giàu trải nghiệm.",
            },
            {
              icon: Telescope,
              l: "03 · Tầm nhìn",
              d:
                h.about_page_vision ||
                "Trở thành cộng đồng học tiếng Trung trực tuyến uy tín, cầu nối giáo dục Việt – Trung.",
            },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl border border-border bg-card p-8">
              <x.icon className="h-7 w-7 text-primary" />
              <div className="mt-4 text-sm font-semibold uppercase tracking-widest text-primary">
                {tr(x.l)}
              </div>
              <p className="mt-2 text-lg text-foreground">{tr(x.d)}</p>
            </div>
          ))}
        </section>
        <section>
          <SectionTitle label={tr("04 · Giá trị cốt lõi")} title={tr("Điều chúng tôi theo đuổi")} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <div key={v.t} className="rounded-2xl border border-border bg-card p-6">
                <v.icon className="h-6 w-6 text-gold" />
                <div className="mt-3 font-bold text-primary-deep">{h[v.titleKey] || tr(v.t)}</div>
                <div className="text-sm text-muted-foreground">{h[v.descKey] || tr(v.d)}</div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle
            label={tr("05 · Cách hoạt động")}
            title={tr("TML hoạt động như thế nào?")}
          />
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s} className="relative rounded-2xl bg-secondary p-6">
                <div className="text-3xl font-extrabold text-primary/40">0{i + 1}</div>
                <div className="mt-2 font-medium">{tr(s)}</div>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <SectionTitle label={tr("06 · Chương trình")} title={tr("Các chương trình chính")} />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROGRAMS.map((p) => (
              <div
                key={p}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <GraduationCap className="h-5 w-5 text-primary" />
                {tr(p)}
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-5 md:grid-cols-3">
          <Link
            to="/organization"
            className="group rounded-2xl bg-brand-gradient p-8 text-primary-foreground"
          >
            <div className="text-sm font-semibold uppercase tracking-widest opacity-80">
              {tr("07 · Cơ cấu tổ chức")}
            </div>
            <div className="mt-2 text-xl font-bold">{tr("Ban Điều hành & 8 Ban chuyên môn")}</div>
            <span className="mt-4 inline-flex items-center gap-1 font-semibold">
              {tr("Xem sơ đồ")} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
          <Link to="/partners" className="group rounded-2xl border border-border bg-card p-8">
            <Globe2 className="h-6 w-6 text-brand-red" />
            <div className="mt-2 text-sm font-semibold uppercase tracking-widest text-primary">
              {tr("08 · Đối tác & cơ hội")}
            </div>
            <div className="mt-2 text-xl font-bold text-primary-deep">
              {tr("Cùng TML mở rộng cơ hội học tập")}
            </div>
            <span className="mt-4 inline-flex items-center gap-1 font-semibold text-primary">
              {tr("Tìm hiểu")} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
          <Link to="/community" className="group rounded-2xl border border-border bg-card p-8">
            <Users className="h-6 w-6 text-primary" />
            <div className="mt-2 text-sm font-semibold uppercase tracking-widest text-primary">
              {tr("09 · Cộng đồng")}
            </div>
            <div className="mt-2 text-xl font-bold text-primary-deep">
              {tr("Những con người cùng tạo nên TML")}
            </div>
            <span className="mt-4 inline-flex items-center gap-1 font-semibold text-primary">
              {tr("Khám phá cộng đồng")} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </section>
      </div>
    </>
  );
}
