import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CheckCircle2, Clock, Users, Video, CalendarDays, Wallet, UserRound } from "lucide-react";
import { DemoBadge, EmptyState, SectionTitle, StatusBadge } from "@/components/site/ui";
import { CONTACT } from "@/components/site/SiteLayout";
import { getCourse } from "@/lib/data/courses";
import { pageMeta } from "@/lib/seo";
import { usePublicTeachers, teachersForLevel } from "@/lib/teachers";

export const Route = createFileRoute("/courses/hsk/$courseId")({
  loader: ({ params }) => {
    const course = getCourse(params.courseId);
    if (!course) throw notFound();
    return { course };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? pageMeta(`HSK ${loaderData.course.level} – ${loaderData.course.name}`, loaderData.course.description)
      : [{ title: "Không tìm thấy khóa học" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: CourseNotFound,
  component: PCourse,
});

function CourseNotFound() {
  return <div className="mx-auto max-w-3xl px-4 py-20"><EmptyState title="Không tìm thấy khóa học" desc="Khóa học không tồn tại hoặc đã bị gỡ." /><div className="mt-6 text-center"><Link to="/courses/hsk" className="font-semibold text-primary">← Tất cả khóa học</Link></div></div>;
}

function PCourse() {
  const { course: c } = Route.useLoaderData();
  const { data: teachers } = usePublicTeachers();
  const ts = teachersForLevel(teachers, c.level);
  const registerHref = `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Đăng ký khóa HSK ${c.level}`)}`;
  return (
    <>
      <section className="grid-lines border-b border-border bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
          <Link to="/courses/hsk" className="text-sm font-medium text-primary">← Khóa học HSK</Link>
          <div className="mt-4 flex flex-wrap items-center gap-2"><span className="rounded-lg bg-brand-gradient px-3 py-1 text-sm font-bold text-primary-foreground">HSK {c.level}</span><StatusBadge status={c.status} />{c.demo && <DemoBadge />}</div>
          <h1 className="mt-4 text-3xl font-bold text-primary-deep md:text-5xl">{c.name}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">{c.description}</p>
          <a href={registerHref} className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90">ĐĂNG KÝ KHÓA HỌC</a>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-12">
          <section><SectionTitle label="Nội dung" title="Bạn sẽ học gì" />
            <ol className="mt-6 space-y-3">{c.syllabus.map((s, i) => <li key={s} className="flex gap-4 rounded-xl border border-border bg-card p-4"><span className="font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>{s}</li>)}</ol>
          </section>
          <section className="grid gap-5 md:grid-cols-2">
            <List title="Đối tượng phù hợp" items={c.audience} />
            <List title="Đầu ra" items={c.outcomes} />
          </section>
          <section><SectionTitle label="FAQ" title="Câu hỏi thường gặp" />
            <div className="mt-6 space-y-3">{c.faq.map((f) => <details key={f.q} className="rounded-xl border border-border bg-card p-4"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-2 text-sm text-muted-foreground">{f.a}</p></details>)}</div>
          </section>
        </div>
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          {ts.length === 0 ? (
            <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary"><UserRound className="h-6 w-6" /></div><div><div className="text-xs text-muted-foreground">Giáo viên</div><div className="font-semibold">Đang cập nhật</div></div></div>
          ) : ts.map((t) => (
            <div key={t.id} className="flex items-start gap-3">
              {t.avatar_url ? <img src={t.avatar_url} alt={t.full_name} className="h-12 w-12 shrink-0 rounded-full object-cover" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-primary"><UserRound className="h-6 w-6" /></div>}
              <div><div className="text-xs text-muted-foreground">Giáo viên{t.title ? ` · ${t.title}` : ""}</div><div className="font-semibold">{t.full_name}</div>{t.bio && <p className="mt-1 text-sm text-muted-foreground">{t.bio}</p>}</div>
            </div>
          ))}
          <Info icon={Clock} l="Số buổi / thời lượng" v={`${c.sessions} buổi · ${c.duration}`} />
          <Info icon={CalendarDays} l="Lịch học" v={c.schedule} />
          <Info icon={Video} l="Hình thức" v={c.mode} />
          <Info icon={Wallet} l="Học phí" v={c.fee} />
          <Info icon={Users} l="Số lượng" v={`Tối đa ${c.capacity} học viên`} />
          <a href={registerHref} className="block rounded-full bg-primary py-3 text-center font-semibold text-primary-foreground hover:opacity-90">ĐĂNG KÝ KHÓA HỌC</a>
          <p className="text-center text-xs text-muted-foreground">Chưa cần thanh toán online.</p>
        </aside>
      </div>
    </>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl bg-secondary p-6"><div className="font-bold text-primary-deep">{title}</div><ul className="mt-3 space-y-2">{items.map((i) => <li key={i} className="flex gap-2 text-sm"><CheckCircle2 className="h-4 w-4 shrink-0 text-success" />{i}</li>)}</ul></div>;
}

function Info({ icon: I, l, v }: { icon: typeof Clock; l: string; v: string }) {
  return <div className="flex gap-3 text-sm"><I className="mt-0.5 h-4 w-4 text-primary" /><div><div className="text-xs text-muted-foreground">{l}</div><div className="font-medium">{v}</div></div></div>;
}
