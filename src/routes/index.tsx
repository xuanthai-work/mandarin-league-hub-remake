import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Award,
  BookOpen,
  CalendarDays,
  Clock,
  Facebook,
  GraduationCap,
  HandHeart,
  Handshake,
  Instagram,
  Linkedin,
  LockKeyhole,
  Mail,
  Megaphone,
  Music2,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { useT, useTr } from "@/lib/i18n";
import { useSiteContent } from "@/lib/site-content";
import {
  classFee,
  fmtDate as fmtClassDate,
  HSK_LEVELS,
  usePublishedClasses,
  type HskClass,
} from "@/lib/hsk-classes";
import { STATUS_LABEL } from "@/lib/programs";
import { getCourse, getCourses } from "@/lib/data/courses";
import type { Course } from "@/lib/data/types";
import {
  CATEGORY_LABEL,
  fmtDateTime,
  usePublicActivities,
  type ActivityCategory,
  type ActivityRow,
} from "@/lib/activities";
import { EmptyState, SectionLabel } from "@/components/site/ui";
import { PhotoOverlayCard } from "@/components/site/PhotoOverlayCard";
import { TeacherPhotoCard } from "@/components/site/TeacherPhotoCard";
import { usePublicTeachers, type PublicTeacher } from "@/lib/teachers";
import {
  fmtDate as fmtNewsDate,
  useActivePartners,
  usePublishedNews,
  type NewsRow,
} from "@/lib/news-db";
import { ActivityCarousel } from "@/components/site/ActivityCarousel";
import { OrgChartSection } from "@/components/site/OrgChartSection";
import { ContactForm } from "@/components/site/ContactForm";
import {
  ActivityDialog,
  CourseDialog,
  NewsDialog,
  TeacherDialog,
  VerifyDialog,
} from "@/components/site/LandingDialogs";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "The Mandarin League | Liên Đoàn Hán Ngữ" },
      {
        name: "description",
        content:
          "Cộng đồng học tiếng Trung trực tuyến: khóa học HSK, workshop, cuộc thi và hoạt động cộng đồng.",
      },
      { property: "og:title", content: "The Mandarin League | Liên Đoàn Hán Ngữ" },
      {
        property: "og:description",
        content:
          "Cộng đồng học tiếng Trung trực tuyến: khóa học HSK, workshop, cuộc thi và hoạt động cộng đồng.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const VALUES = [
  { icon: BookOpen, t: "Học tập", d: "Học bài bản, thực chất." },
  { icon: Users, t: "Cộng đồng", d: "Cùng nhau tiến bộ." },
  { icon: Sparkles, t: "Sáng tạo", d: "Đổi mới cách học." },
  { icon: HandHeart, t: "Trách nhiệm", d: "Minh bạch, tận tâm." },
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

const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  "workshop",
  "competition",
  "camp",
  "event",
  "community",
  "other",
];

const VERIFY_OPTIONS = [
  {
    kind: "certificate" as const,
    icon: ShieldCheck,
    title: "Xác minh chứng nhận",
    chinese: "证书验证",
    description:
      "Kiểm tra tính xác thực của chứng nhận do The Mandarin League phát hành hoặc ghi nhận.",
    button: "Xác minh chứng nhận",
  },
  {
    kind: "hsk" as const,
    icon: Award,
    title: "Xác minh kết quả HSK",
    chinese: "HSK 成绩验证",
    description: "Kiểm tra kết quả HSK được TML ghi nhận hoặc xác minh trong hệ thống.",
    button: "Xác minh kết quả HSK",
  },
];

function Home() {
  const { lang, t } = useT();
  const tr = useTr();
  const { data: h, preview } = useSiteContent("home");
  const site = useSiteContent("site").data;

  const classQuery = usePublishedClasses();
  const allClasses = classQuery.data ?? [];
  const openLevels = new Set(
    allClasses.filter((c) => c.status === "enrolling").map((c) => c.level),
  );
  const [courseLevel, setCourseLevel] = useState(0);
  const [activityCat, setActivityCat] = useState<ActivityCategory | "all">("all");
  const [selectedCourse, setSelectedCourse] = useState<{
    course: Course;
    cls?: HskClass;
  } | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<PublicTeacher | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRow | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsRow | null>(null);
  const [verifyKind, setVerifyKind] = useState<"certificate" | "hsk" | null>(null);

  const classes = allClasses.filter((c) => !courseLevel || c.level === courseLevel);
  const roadmap = getCourses().filter((c) => !courseLevel || c.level === courseLevel);
  const openClass = (c: HskClass) => {
    const course = getCourse(`hsk-${c.level}`);
    if (course) setSelectedCourse({ course, cls: c });
  };

  const activities = usePublicActivities();
  const acts = (activities.data ?? [])
    .filter((a) => activityCat === "all" || a.category === activityCat)
    .slice(0, 6);

  const visibleTeachers = usePublicTeachers().data ?? [];
  const pickedTeachers = visibleTeachers.filter((x) => x.show_on_home);
  const faculty = (pickedTeachers.length ? pickedTeachers : visibleTeachers).slice(0, 6);

  const news = usePublishedNews();
  const articles = (news.data ?? []).slice(0, 3);
  const partnerQuery = useActivePartners();
  const partners = partnerQuery.data ?? [];

  return (
    <>
      {preview && (
        <div className="bg-gold/20 py-2 text-center text-sm font-semibold text-primary-deep">
          {tr("Đang xem trước bản nháp — khách truy cập chưa thấy nội dung này.")}
        </div>
      )}

      {/* Hero */}
      <section id="hero" className="grid-lines relative scroll-mt-24 overflow-hidden bg-secondary">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:px-6 md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              {h.hero_badge || tr("Online Chinese Learning Community")}
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-primary-deep md:text-6xl">
              {h.hero_title || "The Mandarin League"}
            </h1>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 text-2xl font-semibold text-primary md:text-3xl">
              <span>{tr("Liên Đoàn Hán Ngữ")}</span>
              {lang !== "zh" && <span className="font-han">普通话联盟</span>}
            </div>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {h.hero_lead || t("home.lead")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={h.btn1_url || "/join"}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
              >
                {h.btn1_label || t("cta.join")} <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={
                  !h.btn2_url || h.btn2_url === "/courses" || h.btn2_url === "/courses/hsk"
                    ? "#courses"
                    : h.btn2_url
                }
                onClick={(e) => {
                  if (!h.btn2_url || h.btn2_url === "/courses" || h.btn2_url === "/courses/hsk") {
                    e.preventDefault();
                    document
                      .getElementById("courses")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    window.history.replaceState(null, "", "#courses");
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background px-6 py-3 font-semibold text-primary-deep transition hover:bg-accent"
              >
                {h.btn2_label || t("cta.hsk")}
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-0 rounded-full bg-primary/15 blur-3xl" />
            <img
              src="/logo.svg"
              alt="Logo The Mandarin League"
              className="relative w-full rounded-full bg-background p-4 shadow-2xl shadow-primary/20"
            />
          </div>
        </div>
      </section>

      {/* About: mission, values and community groups */}
      {h.show.about && (
        <section id="about" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 md:px-6">
          <div className="grid gap-10 md:grid-cols-2">
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
              <Link
                to="/about"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                {tr("Tìm hiểu thêm")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
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

          <div className="mt-12">
            <h3 className="text-xl font-bold text-primary-deep">{tr("Giá trị cốt lõi")}</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map((v) => (
                <div key={v.t} className="rounded-2xl border border-border bg-card p-6">
                  <v.icon className="h-6 w-6 text-gold" />
                  <div className="mt-3 font-bold text-primary-deep">{tr(v.t)}</div>
                  <div className="text-sm text-muted-foreground">{tr(v.d)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold uppercase tracking-widest text-primary">
                  {tr("Cộng đồng TML")}
                </div>
                <h3 className="mt-1 text-xl font-bold text-primary-deep">
                  {tr("Những con người cùng tạo nên TML")}
                </h3>
              </div>
              <Link
                to="/community"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                {tr("Khám phá cộng đồng")} <ArrowRight className="h-4 w-4" />
              </Link>
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
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {tr(g.d)}
                      </p>
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
      )}

      {/* Organization: the exact SVG chart + per-department drawer from /organization */}
      <OrgChartSection id="organization" heading />

      {/* Courses: HSK classes with level filter, format, seats and fee (or the 1–6 roadmap) */}
      {h.show.courses && (
        <>
          <section id="courses" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 md:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <SectionLabel>{tr("Khóa học HSK")}</SectionLabel>
                <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">
                  {tr("Chọn cấp độ phù hợp với bạn")}
                </h2>
              </div>
              <Link
                to="/courses/hsk"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                {tr("Tất cả khóa học")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              {[0, ...HSK_LEVELS].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setCourseLevel(l)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition ${courseLevel === l ? "border-primary bg-accent text-primary" : "border-border bg-card hover:border-primary/50"}`}
                >
                  {l ? `HSK ${l}` : tr("Tất cả")}
                </button>
              ))}
            </div>

            {classes.length > 0 ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {classes.map((c) => {
                  const full = (c.seats ?? 0) >= c.max_students;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => openClass(c)}
                      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                    >
                      {c.thumb ? (
                        <img
                          src={c.thumb}
                          alt={c.name}
                          loading="lazy"
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-video items-center justify-center bg-brand-gradient">
                          <span className="text-3xl font-bold text-primary-foreground">
                            HSK {c.level}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                            HSK {c.level}
                          </span>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                            {full ? tr("Đã đủ sĩ số") : tr(STATUS_LABEL[c.status])}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold">{c.name}</h3>
                        {c.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {c.description}
                          </p>
                        )}
                        <div className="mt-auto grid gap-1 pt-4 text-sm text-muted-foreground">
                          {(c.start_date || c.schedule) && (
                            <span className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4" />
                              {[
                                fmtClassDate(c.start_date) &&
                                  `${fmtClassDate(c.start_date)}${c.end_date ? ` → ${fmtClassDate(c.end_date)}` : ""}`,
                                c.schedule,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                          <span className="flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            {tr(c.format)}
                            {c.duration && ` · ${c.duration}`}
                          </span>
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {c.seats}/{c.max_students} {tr("học viên")}
                          </span>
                          <span className="flex items-center gap-2 font-semibold text-primary-deep">
                            <Wallet className="h-4 w-4" />
                            {tr(classFee(c))}
                          </span>
                        </div>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                          {tr("Xem chi tiết & đăng ký")} <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {roadmap.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCourse({ course: c })}
                    className="group flex flex-col rounded-2xl border border-border bg-card p-6 text-left transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-fit rounded-lg bg-brand-gradient px-3 py-1 text-sm font-bold text-primary-foreground">
                        HSK {c.level}
                      </span>
                      {openLevels.has(c.level) && (
                        <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
                          {tr("Đang tuyển sinh")}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">{tr(c.name)}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {tr(c.description)}
                    </p>
                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {c.sessions} {tr("buổi")}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        {tr(c.mode)}
                      </span>
                      <span className="inline-flex items-center gap-2 font-semibold text-primary-deep">
                        <Wallet className="h-4 w-4" />
                        {tr(c.fee)}
                      </span>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      {tr("Xem chi tiết")} <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
            )}

            <p className="mt-6 text-sm text-muted-foreground">
              {tr(
                "Mỗi cấp độ có lớp đang mở theo từng đợt tuyển sinh — xem lịch khai giảng và đăng ký tại trang khóa học.",
              )}
            </p>
          </section>
        </>
      )}

      {/* Faculty — medium cards balance presence and page height */}
      <section id="teachers" className="scroll-mt-24 border-t border-border py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>师资团队 · {tr("Đội ngũ Giảng viên")}</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">
                {tr("ĐỘI NGŨ GIẢNG VIÊN")}
              </h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                {tr(
                  "Đội ngũ giáo viên đồng hành cùng người học trên hành trình chinh phục tiếng Trung, phát triển năng lực ngôn ngữ và mở rộng cơ hội học tập.",
                )}
              </p>
            </div>
            <Link
              to="/teachers"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              {tr("Xem tất cả giáo viên")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {faculty.length === 0 ? (
            <div className="mt-10">
              <EmptyState
                title={tr("Đang cập nhật")}
                desc={tr("Đội ngũ giảng viên sẽ sớm được giới thiệu.")}
              />
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {faculty.map((x) => (
                <TeacherPhotoCard key={x.id} teacher={x} onClick={() => setSelectedTeacher(x)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Activities: category chips, activity cards and the photo carousel */}
      {h.show.activities && (
        <section id="activities" className="scroll-mt-24 bg-secondary py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <SectionLabel>{tr("Hoạt động tiêu biểu")}</SectionLabel>
                <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">
                  {tr("Học qua trải nghiệm")}
                </h2>
              </div>
              <Link
                to="/activities"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                {tr("Xem tất cả")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { value: "all" as const, label: tr("Tất cả") },
                ...ACTIVITY_CATEGORIES.map((c) => ({
                  value: c,
                  label: tr(CATEGORY_LABEL[c]),
                })),
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActivityCat(option.value)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                    activityCat === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {acts.length === 0 && (
                <div className="md:col-span-3">
                  <EmptyState
                    title={tr("Đang cập nhật")}
                    desc={tr("Hoạt động mới sẽ sớm được công bố.")}
                  />
                </div>
              )}
              {acts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedActivity(a)}
                  className="overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                >
                  {a.banner ? (
                    <img
                      src={a.banner}
                      alt={a.title}
                      loading="lazy"
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="grid-lines flex h-40 items-center justify-center bg-accent">
                      <CalendarDays className="h-10 w-10 text-primary/60" />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase tracking-wider text-primary">
                        {tr(CATEGORY_LABEL[a.category])}
                      </span>
                      <span className="text-muted-foreground">{tr(fmtDateTime(a.start_time))}</span>
                    </div>
                    <h3 className="mt-3 font-semibold">{a.title}</h3>
                  </div>
                </button>
              ))}
            </div>

            {h.show.carousel && <ActivityCarousel embedded />}

            {/* News lives inside the same section as activities (header item #activities) */}
            <div id="news" className="mt-16 scroll-mt-24 border-t border-border pt-12">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <SectionLabel>{tr("Bản tin & kiến thức")}</SectionLabel>
                  <h3 className="mt-3 text-2xl font-bold text-primary-deep md:text-3xl">
                    {tr("Tin tức & kiến thức HSK")}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    {tr("Nội dung chính thức do The Mandarin League biên soạn.")}
                  </p>
                </div>
                <Link
                  to="/news"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  {tr("Xem tất cả tin tức")} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {news.isLoading && (
                  <p className="text-sm text-muted-foreground">{tr("Đang tải…")}</p>
                )}
                {!news.isLoading && articles.length === 0 && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <EmptyState desc="Tin tức mới sẽ sớm được cập nhật." />
                  </div>
                )}
                {articles.map((n) => (
                  <PhotoOverlayCard
                    key={n.id}
                    image={n.cover}
                    imageAlt={n.title}
                    fallback={<span className="font-han text-5xl text-primary/70">文</span>}
                    eyebrow={n.category}
                    badge={
                      n.is_featured ? <Star className="h-4 w-4 fill-gold text-gold" /> : undefined
                    }
                    title={n.title}
                    subtitle={`${n.author_name} · ${fmtNewsDate(n.published_at)}`}
                    description={n.summary}
                    actionLabel={tr("Đọc bài viết")}
                    onClick={() => setSelectedNews(n)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Partners */}
      <section id="partners" className="scroll-mt-24 bg-secondary py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>{tr("Đối tác đồng hành")}</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">
                {tr("Cùng TML mở rộng cơ hội học tập")}
              </h2>
            </div>
            <Link
              to="/partners"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              {tr("Xem tất cả đối tác")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {partners.length === 0 ? (
            <div className="mt-8">
              <EmptyState desc="Danh sách đối tác sẽ được TML công bố chính thức." />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {partners.slice(0, 10).map((p) => {
                const logo = p.logo ? (
                  <img
                    src={p.logo}
                    alt={p.name}
                    loading="lazy"
                    className="max-h-12 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-center text-sm font-semibold text-primary-deep">
                    {p.name}
                  </span>
                );
                return p.website_url ? (
                  <a
                    key={p.id}
                    href={p.website_url}
                    target="_blank"
                    rel="noreferrer"
                    title={p.name}
                    className="group flex h-24 items-center justify-center rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    {logo}
                  </a>
                ) : (
                  <div
                    key={p.id}
                    title={p.name}
                    className="flex h-24 items-center justify-center rounded-2xl border border-border bg-card p-5"
                  >
                    {logo}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Handshake className="h-5 w-5 text-primary" />
            <span>{tr("Bạn muốn hợp tác cùng TML?")}</span>
            <a
              href={`mailto:${site.email}?subject=${encodeURIComponent(tr("Hợp tác cùng TML"))}`}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              {tr("Liên hệ hợp tác")} <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Verification: the two large cards from /verify plus its trust strip */}
      <section id="verify" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div className="text-center">
            <SectionLabel>{tr("Trung tâm xác minh")}</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">
              {tr("Tra cứu chứng nhận & điểm HSK")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {tr(
                "Kiểm tra tính xác thực của chứng nhận và kết quả được ghi nhận trong hệ thống của The Mandarin League.",
              )}
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {VERIFY_OPTIONS.map((option) => (
              <article
                key={option.kind}
                className="group flex flex-col border border-border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-xl md:p-8"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-primary">
                  <option.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-7 text-2xl font-extrabold text-primary-deep">
                  {tr(option.title)}
                </h3>
                <p className="mt-1 font-han text-lg text-primary">{option.chinese}</p>
                <p className="mt-4 flex-1 leading-relaxed text-muted-foreground">
                  {tr(option.description)}
                </p>
                <button
                  type="button"
                  onClick={() => setVerifyKind(option.kind)}
                  className="mt-7 inline-flex w-full items-center justify-between gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  {tr(option.button)} <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
          <div className="mt-8 grid gap-4 border-y border-border py-6 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <QrCode className="h-5 w-5 text-primary" />
              <span>{tr("Hỗ trợ đường dẫn xác minh riêng cho mã QR")}</span>
            </div>
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-5 w-5 text-primary" />
              <span>{tr("Chỉ hiển thị thông tin cần thiết để xác minh")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & join */}
      {h.show.cta && (
        <section id="contact" className="scroll-mt-24 border-t border-border py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
              <div className="flex flex-col justify-between gap-8 rounded-3xl bg-brand-gradient p-8 text-primary-foreground md:p-12">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-widest opacity-80">
                    {tr("Kết nối & Ứng tuyển")}
                  </div>
                  <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                    {h.cta_title || tr("Sẵn sàng trở thành một phần của TML?")}
                  </h2>
                  <p className="mt-4 max-w-lg opacity-90">
                    {h.cta_body ||
                      tr(
                        "Ứng tuyển vào một trong 8 Ban, học hỏi kỹ năng mới và cùng lan tỏa tình yêu tiếng Trung.",
                      )}
                  </p>
                  <Link
                    to="/join"
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 font-semibold text-primary-deep transition hover:opacity-90"
                  >
                    {t("cta.join")} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="space-y-3 border-t border-primary-foreground/20 pt-6 text-sm">
                  <a
                    href={`mailto:${site.email}`}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Mail className="h-5 w-5" />
                    {site.email}
                  </a>
                  <a
                    href={site.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Facebook className="h-5 w-5" />
                    Facebook TML
                  </a>
                  <a
                    href={site.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Instagram className="h-5 w-5" />
                    Instagram TML
                  </a>
                  {site.threads && (
                    <a
                      href={site.threads}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 hover:underline"
                    >
                      <AtSign className="h-5 w-5" />
                      Threads TML
                    </a>
                  )}
                  {site.tiktok && (
                    <a
                      href={site.tiktok}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 hover:underline"
                    >
                      <Music2 className="h-5 w-5" />
                      TikTok TML
                    </a>
                  )}
                  {site.linkedin && (
                    <a
                      href={site.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 hover:underline"
                    >
                      <Linkedin className="h-5 w-5" />
                      LinkedIn TML
                    </a>
                  )}
                </div>
              </div>
              <ContactForm />
            </div>
          </div>
        </section>
      )}

      {selectedCourse && (
        <CourseDialog
          course={selectedCourse.course}
          cls={selectedCourse.cls}
          onClose={() => setSelectedCourse(null)}
        />
      )}
      {selectedTeacher && (
        <TeacherDialog teacher={selectedTeacher} onClose={() => setSelectedTeacher(null)} />
      )}
      {selectedActivity && (
        <ActivityDialog a={selectedActivity} onClose={() => setSelectedActivity(null)} />
      )}
      {selectedNews && <NewsDialog article={selectedNews} onClose={() => setSelectedNews(null)} />}
      {verifyKind && <VerifyDialog kind={verifyKind} onClose={() => setVerifyKind(null)} />}
    </>
  );
}
