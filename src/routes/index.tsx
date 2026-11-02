import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Users, CalendarDays, Mail, Facebook, Instagram, AtSign, Video } from "lucide-react";
import { useT, useTr } from "@/lib/i18n";
import { useSiteContent } from "@/lib/site-content";
import { usePublishedClasses, classFee } from "@/lib/hsk-classes";
import { usePublicActivities, CATEGORY_LABEL, fmtDateTime } from "@/lib/activities";
import { EmptyState } from "@/components/site/ui";
import { TeacherCardCompact } from "@/components/site/TeacherCard";
import { usePublicTeachers } from "@/lib/teachers";

export const Route = createFileRoute("/")({ staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "The Mandarin League | Liên Đoàn Hán Ngữ" },
      { name: "description", content: "Cộng đồng học tiếng Trung trực tuyến: khóa học HSK, workshop, cuộc thi và hoạt động cộng đồng." },
      { property: "og:title", content: "The Mandarin League | Liên Đoàn Hán Ngữ" },
      { property: "og:description", content: "Cộng đồng học tiếng Trung trực tuyến: khóa học HSK, workshop, cuộc thi và hoạt động cộng đồng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

import { ActivityCarousel } from "@/components/site/ActivityCarousel";

function Home() {
  const { t } = useT();
  const tr = useTr();
  const { data: h, preview } = useSiteContent("home");
  const site = useSiteContent("site").data;
  const classes = (usePublishedClasses().data ?? []).slice(0, 4);
  const acts = (usePublicActivities().data ?? []).slice(0, 3);
  const faculty = (usePublicTeachers().data ?? []).filter((x) => x.show_on_home).slice(0, 8);
  return (
    <>
      {preview && <div className="bg-gold/20 py-2 text-center text-sm font-semibold text-primary-deep">{tr("Đang xem trước bản nháp — khách truy cập chưa thấy nội dung này.")}</div>}
      {/* Hero */}
      <section className="grid-lines relative overflow-hidden bg-secondary">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:px-6 md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              {h.hero_badge || "Online Chinese Learning Community"}
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-primary-deep md:text-6xl">
              {h.hero_title || "The Mandarin League"}
            </h1>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 text-2xl font-semibold text-primary md:text-3xl">
              <span>{tr("Liên Đoàn Hán Ngữ")}</span>
              <span className="font-han">普通话联盟</span>
            </div>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {h.hero_lead || t("home.lead")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={h.btn1_url || "/join"} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90">
                {h.btn1_label || t("cta.join")} <ArrowRight className="h-4 w-4" />
              </a>
              <a href={h.btn2_url || "/courses/hsk"} className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background px-6 py-3 font-semibold text-primary-deep transition hover:bg-accent">
                {h.btn2_label || t("cta.hsk")}
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-0 rounded-full bg-primary/15 blur-3xl" />
            <img src="/logo.svg" alt="Logo The Mandarin League" className="relative w-full rounded-full bg-background p-4 shadow-2xl shadow-primary/20" />
          </div>
        </div>
      </section>

      {/* About */}
      {h.show.about && <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <SectionLabel>{tr("Về TML")}</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">{h.about_title || tr("Học tiếng Trung cùng một cộng đồng thực thụ")}</h2>
          </div>
          <div className="space-y-4 text-muted-foreground">
            <p>{h.about_p1 || tr("The Mandarin League (TML) là tổ chức cộng đồng phi lợi nhuận, quy tụ các bạn trẻ yêu thích tiếng Trung và văn hóa Trung Hoa, hoạt động hoàn toàn trực tuyến.")}</p>
            <p>{h.about_p2 || tr("Chúng tôi tổ chức khóa học HSK, workshop, cuộc thi và các dự án sáng tạo nội dung, giúp mỗi thành viên vừa học vừa trải nghiệm.")}</p>
            <Link to="/about" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">{tr("Tìm hiểu thêm")} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: BookOpen, n: "HSK 1–6", l: "Lộ trình học bài bản" },
            { icon: Users, n: "8 Ban", l: "Chuyên môn hoạt động" },
            { icon: CalendarDays, n: "Hàng tháng", l: "Workshop & sự kiện" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-border bg-card p-6">
              <s.icon className="h-6 w-6 text-primary" />
              <div className="mt-4 text-2xl font-bold text-primary-deep">{tr(s.n)}</div>
              <div className="text-sm text-muted-foreground">{tr(s.l)}</div>
            </div>
          ))}
        </div>
      </section>}

      {h.show.carousel && <ActivityCarousel />}

      {/* Courses */}
      {h.show.courses && <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>{tr("Khóa học HSK")}</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">{tr("Chọn cấp độ phù hợp với bạn")}</h2>
          </div>
          <Link to="/courses/hsk" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">{tr("Tất cả khóa học")} <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {classes.length === 0 && <div className="sm:col-span-2 lg:col-span-4"><EmptyState title={tr("Đang cập nhật")} desc={tr("TML sẽ sớm mở lớp mới.")} /></div>}
          {classes.map((c) => (
            <Link key={c.id} to="/courses" className="flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/50">
              <span className="w-fit rounded-lg bg-brand-gradient px-3 py-1 text-sm font-bold text-primary-foreground">HSK {c.level}</span>
              <h3 className="mt-5 text-lg font-semibold">{c.name}</h3>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Video className="h-4 w-4" />{tr(c.format)}</div>
                <div className="font-semibold text-primary-deep">{tr(classFee(c))}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>}

      {/* Faculty — hidden until admins pick teachers for the homepage */}
      {faculty.length > 0 && <section className="border-t border-border py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>师资团队 · {tr("Đội ngũ Giảng viên")}</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">{tr("ĐỘI NGŨ GIẢNG VIÊN")}</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">{tr("Đội ngũ giáo viên đồng hành cùng người học trên hành trình chinh phục tiếng Trung, phát triển năng lực ngôn ngữ và mở rộng cơ hội học tập.")}</p>
            </div>
            <Link to="/teachers" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">{tr("Xem tất cả giáo viên")} <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{faculty.map((x) => <TeacherCardCompact key={x.id} t={x} />)}</div>
        </div>
      </section>}

      {/* Activities */}
      {h.show.activities && <section className="bg-secondary py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>{tr("Hoạt động tiêu biểu")}</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">{tr("Học qua trải nghiệm")}</h2>
            </div>
            <Link to="/activities" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">{tr("Xem tất cả")} <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {acts.length === 0 && <div className="md:col-span-3"><EmptyState title={tr("Đang cập nhật")} desc={tr("Hoạt động mới sẽ sớm được công bố.")} /></div>}
            {acts.map((a) => (
              <Link key={a.id} to="/activities/$activityId" params={{ activityId: a.slug }} className="overflow-hidden rounded-2xl border border-border bg-card">
                {a.banner ? <img src={a.banner} alt={a.title} loading="lazy" className="h-40 w-full object-cover" /> : <div className="grid-lines flex h-40 items-center justify-center bg-accent"><CalendarDays className="h-10 w-10 text-primary/60" /></div>}
                <div className="p-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-primary">{tr(CATEGORY_LABEL[a.category])}</span>
                    <span className="text-muted-foreground">{tr(fmtDateTime(a.start_time))}</span>
                  </div>
                  <h3 className="mt-3 font-semibold">{a.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>}

      {/* CTA + contact */}
      {h.show.cta && <section className="mx-auto max-w-7xl px-4 pt-20 md:px-6">
        <div className="grid overflow-hidden rounded-3xl bg-brand-gradient text-primary-foreground md:grid-cols-[1.4fr_1fr]">
          <div className="p-10 md:p-14">
            <h2 className="text-3xl font-bold md:text-4xl">{h.cta_title || tr("Sẵn sàng trở thành một phần của TML?")}</h2>
            <p className="mt-4 max-w-lg opacity-90">{h.cta_body || tr("Ứng tuyển vào một trong 8 Ban, học hỏi kỹ năng mới và cùng lan tỏa tình yêu tiếng Trung.")}</p>
            <Link to="/join" className="mt-8 inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 font-semibold text-primary-deep transition hover:opacity-90">
              {t("cta.join")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4 border-t border-primary-foreground/20 p-10 md:border-l md:border-t-0 md:p-14">
            <div className="text-sm font-semibold uppercase tracking-wider opacity-80">{tr("Liên hệ")}</div>
            <a href={`mailto:${site.email}`} className="flex items-center gap-3 hover:underline"><Mail className="h-5 w-5" />{site.email}</a>
            <a href={site.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline"><Facebook className="h-5 w-5" />Facebook TML</a>
            <a href={site.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline"><Instagram className="h-5 w-5" />Instagram TML</a>
            {site.threads && <a href={site.threads} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline"><AtSign className="h-5 w-5" />Threads TML</a>}
          </div>
        </div>
      </section>}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold uppercase tracking-widest text-primary">{children}</div>;
}
