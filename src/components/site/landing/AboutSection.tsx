import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  HandHeart,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react";
import { useTr } from "@/lib/i18n";
import { SectionLabel } from "@/components/site/ui";
import { CtaLink } from "@/components/site/CtaLink";
import {
  appendPreview,
  usePreviewMode,
  type HomeContent,
  type HomeTextFieldKey,
} from "@/lib/site-content";

const VALUES: {
  titleKey: HomeTextFieldKey;
  descKey: HomeTextFieldKey;
  icon: typeof Users;
  t: string;
  d: string;
}[] = [
  {
    titleKey: "value1_title",
    descKey: "value1_desc",
    icon: BookOpen,
    t: "Học tập",
    d: "Học bài bản, thực chất.",
  },
  {
    titleKey: "value2_title",
    descKey: "value2_desc",
    icon: Users,
    t: "Cộng đồng",
    d: "Cùng nhau tiến bộ.",
  },
  {
    titleKey: "value3_title",
    descKey: "value3_desc",
    icon: Sparkles,
    t: "Sáng tạo",
    d: "Đổi mới cách học.",
  },
  {
    titleKey: "value4_title",
    descKey: "value4_desc",
    icon: HandHeart,
    t: "Trách nhiệm",
    d: "Minh bạch, tận tâm.",
  },
];

const COMMUNITY_GROUPS: {
  icon: typeof Users;
  t: string;
  d: string;
  to?: "/organization" | "/teachers";
}[] = [
  { icon: Users, t: "Thành viên", d: "Những người đang tham gia TML.", to: "/organization" },
  { icon: GraduationCap, t: "Giáo viên", d: "Đội ngũ giảng dạy và chuyên môn.", to: "/teachers" },
  { icon: HandHeart, t: "Tình nguyện viên", d: "Đóng góp cho hoạt động của TML." },
  { icon: Sparkles, t: "Mentor", d: "Hỗ trợ học tập và phát triển." },
  { icon: Megaphone, t: "Đại sứ", d: "Lan tỏa hình ảnh và hoạt động TML." },
];

export function AboutSection({ h }: { h: HomeContent }) {
  const tr = useTr();
  const preview = usePreviewMode();

  return (
    <section id="about" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 md:px-6">
      <div className="grid gap-10 md:grid-cols-2 reveal-on-scroll">
        <div>
          <SectionLabel>{tr("Về TML")}</SectionLabel>
          <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">
            {h.about_title || tr("Học tiếng Trung cùng một cộng đồng thực thụ")}
          </h2>
        </div>
        <div className="space-y-4 text-muted-foreground">
          <p>
            {h.about_p1 ||
              tr(
                "The Mandarin League (TML) là tổ chức cộng đồng phi lợi nhuận, quy tụ các bạn trẻ yêu thích tiếng Trung và văn hóa Trung Hoa, hoạt động hoàn toàn trực tuyến.",
              )}
          </p>
          <p>
            {h.about_p2 ||
              tr(
                "Chúng tôi tổ chức khóa học HSK, workshop, cuộc thi và các dự án sáng tạo nội dung, giúp mỗi thành viên vừa học vừa trải nghiệm.",
              )}
          </p>
          <CtaLink
            href={appendPreview(h.about_cta_url || "/about", preview)}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            {h.about_cta_label || tr("Tìm hiểu thêm")} <ArrowRight className="h-4 w-4" />
          </CtaLink>
        </div>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3 reveal-on-scroll">
        {[
          {
            icon: BookOpen,
            n: h.stat1_value || tr("HSK 1–6"),
            l: h.stat1_label || tr("Lộ trình học bài bản"),
          },
          {
            icon: Users,
            n: h.stat2_value || tr("8 Ban"),
            l: h.stat2_label || tr("Chuyên môn hoạt động"),
          },
          {
            icon: CalendarDays,
            n: h.stat3_value || tr("Hàng tháng"),
            l: h.stat3_label || tr("Workshop & sự kiện"),
          },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6">
            <s.icon className="h-6 w-6 text-primary" />
            <div className="mt-4 text-2xl font-bold text-primary-deep">{s.n}</div>
            <div className="text-sm text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="mt-12 reveal-on-scroll">
        <h3 className="text-xl font-bold text-primary-deep">
          {h.values_title || tr("Giá trị cốt lõi")}
        </h3>
        {h.values_lead && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{h.values_lead}</p>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.t} className="rounded-2xl border border-border bg-card p-6">
              <v.icon className="h-6 w-6 text-gold" />
              <div className="mt-3 font-bold text-primary-deep">{h[v.titleKey] || tr(v.t)}</div>
              <div className="text-sm text-muted-foreground">{h[v.descKey] || tr(v.d)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 rounded-3xl border border-border bg-card p-6 md:p-8 reveal-on-scroll">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold uppercase tracking-widest text-primary">
              {tr("Cộng đồng TML")}
            </div>
            <h3 className="mt-1 text-xl font-bold text-primary-deep">
              {h.community_title || tr("Những con người cùng tạo nên TML")}
            </h3>
            {h.community_desc && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{h.community_desc}</p>
            )}
          </div>
          <CtaLink
            href={appendPreview(h.community_cta_url || "/community", preview)}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            {h.community_cta_label || tr("Khám phá cộng đồng")} <ArrowRight className="h-4 w-4" />
          </CtaLink>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {COMMUNITY_GROUPS.map((g) => {
            if (g.to)
              return (
                <Link
                  key={g.t}
                  to={g.to}
                  className="group cursor-pointer rounded-xl border border-transparent bg-secondary p-4 transition duration-200 hover:border-primary/40 hover:bg-accent/60"
                >
                  <div className="flex items-center justify-between">
                    <g.icon className="h-5 w-5 text-primary" />
                    <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </div>
                  <div className="mt-2 font-semibold text-primary-deep group-hover:text-primary">
                    {tr(g.t)}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tr(g.d)}</p>
                </Link>
              );

            return (
              <div key={g.t} className="rounded-xl bg-secondary p-4">
                <g.icon className="h-5 w-5 text-primary" />
                <div className="mt-2 font-semibold text-primary-deep">{tr(g.t)}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tr(g.d)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
