import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Users, CalendarDays, Mail, Facebook, Youtube, Clock, Video } from "lucide-react";
import logo from "@/assets/tml-logo.png.asset.json";
import { CONTACT } from "@/components/site/SiteLayout";
import { useT } from "@/lib/i18n";

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

const COURSES = [
  { level: "HSK 1", name: "Nhập môn tiếng Trung", sessions: 24, mode: "Online qua Zoom", status: "Đang tuyển sinh" },
  { level: "HSK 2", name: "Giao tiếp cơ bản", sessions: 24, mode: "Online qua Zoom", status: "Đang tuyển sinh" },
  { level: "HSK 3", name: "Tiếng Trung trung cấp", sessions: 30, mode: "Online qua Zoom", status: "Sắp khai giảng" },
  { level: "HSK 4", name: "Luyện thi HSK 4", sessions: 36, mode: "Online qua Zoom", status: "Sắp khai giảng" },
];

const ACTIVITIES = [
  { tag: "Workshop", title: "Viết chữ Hán thư pháp cho người mới", date: "Tháng 11/2026" },
  { tag: "Cuộc thi", title: "Hùng biện tiếng Trung TML Speak Up", date: "Tháng 12/2026" },
  { tag: "Webinar", title: "Chiến lược ôn thi HSK hiệu quả", date: "Tháng 10/2026" },
];

function Home() {
  const { t } = useT();
  return (
    <>
      {/* Hero */}
      <section className="grid-lines relative overflow-hidden bg-secondary">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:px-6 md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              Online Chinese Learning Community
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-primary-deep md:text-6xl">
              The Mandarin League
            </h1>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 text-2xl font-semibold text-primary md:text-3xl">
              <span>Liên Đoàn Hán Ngữ</span>
              <span className="font-han">普通话联盟</span>
            </div>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t("home.lead")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/join" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90">
                {t("cta.join")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/courses/hsk" className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background px-6 py-3 font-semibold text-primary-deep transition hover:bg-accent">
                {t("cta.hsk")}
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-0 rounded-full bg-primary/15 blur-3xl" />
            <img src={logo.url} alt="Logo The Mandarin League" className="relative w-full rounded-full bg-background p-4 shadow-2xl shadow-primary/20" />
          </div>
        </div>
      </section>

      {/* About */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <SectionLabel>Về TML</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">Học tiếng Trung cùng một cộng đồng thực thụ</h2>
          </div>
          <div className="space-y-4 text-muted-foreground">
            <p>The Mandarin League (TML) là tổ chức cộng đồng phi lợi nhuận, quy tụ các bạn trẻ yêu thích tiếng Trung và văn hóa Trung Hoa, hoạt động hoàn toàn trực tuyến.</p>
            <p>Chúng tôi tổ chức khóa học HSK, workshop, cuộc thi và các dự án sáng tạo nội dung, giúp mỗi thành viên vừa học vừa trải nghiệm.</p>
            <Link to="/about" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Tìm hiểu thêm <ArrowRight className="h-4 w-4" /></Link>
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
              <div className="mt-4 text-2xl font-bold text-primary-deep">{s.n}</div>
              <div className="text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <ActivityCarousel />

      {/* Courses */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Khóa học HSK</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">Chọn cấp độ phù hợp với bạn</h2>
          </div>
          <Link to="/courses/hsk" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Tất cả khóa học <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {COURSES.map((c) => (
            <div key={c.level} className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-brand-gradient px-3 py-1 text-sm font-bold text-primary-foreground">{c.level}</span>
                <span className="text-xs font-medium text-primary">{c.status}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{c.name}</h3>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{c.sessions} buổi</div>
                <div className="flex items-center gap-2"><Video className="h-4 w-4" />{c.mode}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Activities */}
      <section className="bg-secondary py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>Hoạt động tiêu biểu</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">Học qua trải nghiệm</h2>
            </div>
            <Link to="/activities" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Xem tất cả <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {ACTIVITIES.map((a, i) => (
              <article key={a.title} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="grid-lines flex h-40 items-center justify-center bg-accent">
                  <span className="font-han text-5xl text-primary/70">{["写", "说", "学"][i]}</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-primary">{a.tag}</span>
                    <span className="text-muted-foreground">{a.date}</span>
                  </div>
                  <h3 className="mt-3 font-semibold">{a.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + contact */}
      <section className="mx-auto max-w-7xl px-4 pt-20 md:px-6">
        <div className="grid overflow-hidden rounded-3xl bg-brand-gradient text-primary-foreground md:grid-cols-[1.4fr_1fr]">
          <div className="p-10 md:p-14">
            <h2 className="text-3xl font-bold md:text-4xl">Sẵn sàng trở thành một phần của TML?</h2>
            <p className="mt-4 max-w-lg opacity-90">Ứng tuyển vào một trong 8 Ban, học hỏi kỹ năng mới và cùng lan tỏa tình yêu tiếng Trung.</p>
            <Link to="/join" className="mt-8 inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 font-semibold text-primary-deep transition hover:opacity-90">
              Tham gia TML <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4 border-t border-primary-foreground/20 p-10 md:border-l md:border-t-0 md:p-14">
            <div className="text-sm font-semibold uppercase tracking-wider opacity-80">Liên hệ</div>
            <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 hover:underline"><Mail className="h-5 w-5" />{CONTACT.email}</a>
            <a href={CONTACT.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline"><Facebook className="h-5 w-5" />Facebook TML</a>
            <a href={CONTACT.youtube} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:underline"><Youtube className="h-5 w-5" />YouTube TML</a>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold uppercase tracking-widest text-primary">{children}</div>;
}
