import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, Clock, ExternalLink, Facebook, Globe, UserRound, Users, Video, Wallet } from "lucide-react";
import { EmptyState } from "@/components/site/ui";
import { EnrollmentDialog } from "@/components/courses/EnrollmentDialog";
import { programFee, STATUS_LABEL, TYPE_LABEL, useProgram } from "@/lib/programs";
import { COURSE_ROLE_LABEL, useCourseTeachers } from "@/lib/teachers";
import { TeacherPhoto } from "@/components/site/TeacherCard";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/courses/$slug")({ staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Chương trình học | The Mandarin League" },
    { name: "description", content: "Chi tiết chương trình học tiếng Trung của The Mandarin League." },
    { property: "og:title", content: "Chương trình học | The Mandarin League" },
    { property: "og:description", content: "Chi tiết chương trình học tiếng Trung của The Mandarin League." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ProgramPage,
});

function ProgramPage() {
  const tr = useTr();
  const { slug } = Route.useParams();
  const { data: p, isLoading } = useProgram(slug);
  const [dlg, setDlg] = useState(false);
  const { data: team } = useCourseTeachers(p?.id);
  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">{tr("Đang tải…")}</div>;
  if (!p) return <div className="mx-auto max-w-3xl px-4 py-20"><EmptyState title="Không tìm thấy chương trình" desc="Chương trình không tồn tại hoặc đã tạm ẩn." /><div className="mt-6 text-center"><Link to="/courses" className="font-semibold text-primary">{tr("← Tất cả chương trình")}</Link></div></div>;
  const fee = programFee(p);
  const canEnroll = p.status === "enrolling";
  const cta = !canEnroll
    ? <div className="rounded-xl bg-muted p-3 text-center text-sm font-semibold text-muted-foreground">{p.status === "ended" ? tr("Chương trình đã kết thúc") : p.status === "ongoing" ? tr("Chương trình đang diễn ra") : tr("Sắp mở đăng ký")}</div>
    : p.registration_url
      ? <a href={p.registration_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90">{tr("Đăng ký ngay")} <ExternalLink className="h-4 w-4" /></a>
      : <button onClick={() => setDlg(true)} className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90">{tr("ĐĂNG KÝ THAM GIA")}</button>;
  return (
    <>
      <section className="grid-lines border-b border-border bg-secondary">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <Link to="/courses" className="text-sm font-medium text-primary">{tr("← Chương trình học")}</Link>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${TYPE_LABEL[p.course_type].tone}`}>{tr(TYPE_LABEL[p.course_type].label)}</span>
              <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold">{tr(STATUS_LABEL[p.status])}</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold text-primary-deep md:text-5xl">{p.title}</h1>
            <p className="mt-4 text-muted-foreground">{p.short_description}</p>
          </div>
          {p.thumb && <img src={p.thumb} alt={p.title} className="aspect-video w-full rounded-2xl object-cover shadow-xl" />}
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          <article className="whitespace-pre-line leading-relaxed">{p.description || tr("Nội dung chi tiết đang cập nhật.")}</article>
          <section>
            <h2 className="text-xl font-bold text-primary-deep">{tr("Giáo viên giảng dạy")}</h2>
            {!team?.length ? <p className="mt-3 text-sm text-muted-foreground">{tr("Danh sách giáo viên đang được cập nhật.")}</p> : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {team.map(({ teacher: x, role }) => (
                  <Link key={x.id} to="/teachers/$teacherId" params={{ teacherId: x.id }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-gold/60">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-gold/40"><TeacherPhoto t={x} /></div>
                    <div><div className="font-semibold">{x.full_name}</div><div className="text-xs text-primary">{tr(COURSE_ROLE_LABEL[role])}</div>{x.title && <div className="text-xs text-muted-foreground">{x.title}</div>}</div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <Info icon={UserRound} l="Giáo viên" v={team?.length ? team.map((x) => x.teacher.full_name).join(", ") : tr("Đang cập nhật")} />
          {p.level && <Info icon={Users} l="Trình độ" v={p.level} />}
          {p.duration && <Info icon={Clock} l="Thời lượng" v={p.duration} />}
          {p.schedule && <Info icon={CalendarDays} l="Lịch học" v={p.schedule} />}
          <Info icon={Video} l="Hình thức" v={p.format} />
          <Info icon={Wallet} l="Học phí" v={tr(fee)} />
          {cta}
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {p.facebook_url && <a href={p.facebook_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary"><Facebook className="h-4 w-4" />Facebook</a>}
            {p.website_url && <a href={p.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary"><Globe className="h-4 w-4" />Website</a>}
          </div>
        </aside>
      </div>
      {dlg && <EnrollmentDialog level={Number(p.level.match(/\d/)?.[0] ?? 0)} courseId={p.id} title={p.title} fee={fee} onClose={() => setDlg(false)} />}
    </>
  );
}

function Info({ icon: I, l, v }: { icon: typeof Clock; l: string; v: string }) {
  const tr = useTr();
  return <div className="flex gap-3 text-sm"><I className="mt-0.5 h-4 w-4 text-primary" /><div><div className="text-xs text-muted-foreground">{tr(l)}</div><div className="font-medium">{tr(v)}</div></div></div>;
}
