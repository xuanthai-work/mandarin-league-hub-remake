import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CheckCircle2, Clock, Users, Video, CalendarDays, Wallet, UserRound } from "lucide-react";
import { DemoBadge, EmptyState, SectionTitle, StatusBadge } from "@/components/site/ui";
import { useState } from "react";
import { EnrollmentDialog } from "@/components/courses/EnrollmentDialog";
import { useCourseSettings } from "@/lib/course-settings";
import { classFee, fmtDate, usePublishedClasses, type HskClass } from "@/lib/hsk-classes";
import { STATUS_LABEL } from "@/lib/programs";
import { getCourse } from "@/lib/data/courses";
import { pageMeta } from "@/lib/seo";
import { usePublicTeachers, leadTeacherForLevel, pickTeachers } from "@/lib/teachers";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/courses/hsk/$courseId")({
  staticData: { sitemap: true },
  loader: ({ params }) => {
    const course = getCourse(params.courseId);
    if (!course) throw notFound();
    return { course };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? pageMeta(
          `HSK ${loaderData.course.level} – ${loaderData.course.name}`,
          loaderData.course.description,
        )
      : [{ title: "Không tìm thấy khóa học" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: CourseNotFound,
  component: PCourse,
});

function CourseNotFound() {
  const tr = useTr();
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <EmptyState title="Không tìm thấy khóa học" desc="Khóa học không tồn tại hoặc đã bị gỡ." />
      <div className="mt-6 text-center">
        <Link to="/courses/hsk" className="font-semibold text-primary">
          {tr("← Tất cả khóa học")}
        </Link>
      </div>
    </div>
  );
}

function PCourse() {
  const tr = useTr();
  const { course: c } = Route.useLoaderData();
  const { data: teachers } = usePublicTeachers();
  const { data: settings } = useCourseSettings();
  const st = settings?.find((x) => x.level === c.level);
  const lead = leadTeacherForLevel(teachers, c.level, st?.lead_teacher_id);
  const { data: classes, isLoading: lc } = usePublishedClasses();
  const openClasses = (classes ?? []).filter(
    (k) => k.level === c.level && k.status === "enrolling",
  );
  const [enroll, setEnroll] = useState<HskClass | null>(null);
  const Btn = ({ block }: { block?: boolean }) => (
    <a
      href="#lop-dang-mo"
      className={
        block
          ? "block w-full rounded-full bg-primary py-3 text-center font-semibold text-primary-foreground hover:opacity-90"
          : "mt-8 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90"
      }
    >
      {tr("XEM LỚP ĐANG MỞ")}
    </a>
  );
  return (
    <>
      <section className="grid-lines border-b border-border bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
          <Link to="/courses/hsk" className="text-sm font-medium text-primary">
            {tr("← Khóa học HSK")}
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-brand-gradient px-3 py-1 text-sm font-bold text-primary-foreground">
              HSK {c.level}
            </span>
            <StatusBadge status={c.status} />
            {c.demo && <DemoBadge />}
          </div>
          <h1 className="mt-4 text-3xl font-bold text-primary-deep md:text-5xl">{c.name}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">{c.description}</p>
          <Btn />
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-12">
          <section id="lop-dang-mo" className="scroll-mt-24">
            <SectionTitle label="Đăng ký" title="Lớp đang tuyển sinh" />
            <div className="mt-6">
              {lc ? (
                <p className="text-sm text-muted-foreground">{tr("Đang tải…")}</p>
              ) : openClasses.length === 0 ? (
                <>
                  <EmptyState
                    title={tr("Chưa có lớp mở")}
                    desc={tr("Hiện chưa có lớp nào đang tuyển sinh cho cấp độ này.")}
                  />
                  <Link
                    to="/courses"
                    className="mt-3 inline-block text-sm font-semibold text-primary"
                  >
                    {tr("Xem tất cả khóa học →")}
                  </Link>
                </>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {openClasses.map((k) => {
                    const full = (k.seats ?? 0) >= k.max_students;
                    return (
                      <div
                        key={k.id}
                        className="flex flex-col rounded-2xl border border-border bg-card p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-semibold">{k.name}</h3>
                          <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                            {full ? tr("Đã đủ sĩ số") : tr(STATUS_LABEL[k.status])}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                          {(k.start_date || k.schedule) && (
                            <span className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4" />
                              {[
                                fmtDate(k.start_date) &&
                                  `${fmtDate(k.start_date)}${k.end_date ? ` → ${fmtDate(k.end_date)}` : ""}`,
                                k.schedule,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {k.seats}/{k.max_students} {tr("học viên")}
                          </span>
                          <span className="flex items-center gap-2 font-semibold text-primary-deep">
                            <Wallet className="h-4 w-4" />
                            {tr(classFee(k))}
                          </span>
                        </div>
                        {!full &&
                          (k.registration_url ? (
                            <a
                              href={k.registration_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-4 rounded-full bg-primary py-2 text-center text-sm font-semibold text-primary-foreground"
                            >
                              {tr("Đăng ký")}
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEnroll(k)}
                              className="mt-4 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground"
                            >
                              {tr("Đăng ký lớp này")}
                            </button>
                          ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
          <section>
            <SectionTitle label="Nội dung khóa học" title="Bạn sẽ học gì" />
            <ol className="mt-6 space-y-3">
              {c.syllabus.map((s, i) => (
                <li key={s} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                  <span className="font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                  {s}
                </li>
              ))}
            </ol>
          </section>
          <section className="grid gap-5 md:grid-cols-2">
            <List title="Đối tượng phù hợp" items={c.audience} />
            <List title="Đầu ra" items={c.outcomes} />
          </section>
          <section>
            <SectionTitle label="FAQ" title="Câu hỏi thường gặp" />
            <div className="mt-6 space-y-3">
              {c.faq.map((f) => (
                <details key={f.q} className="rounded-xl border border-border bg-card p-4">
                  <summary className="cursor-pointer font-semibold">{f.q}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          {!lead ? (
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{tr("Giảng viên phụ trách")}</div>
                <div className="font-semibold">{tr("Đang cập nhật")}</div>
              </div>
            </div>
          ) : (
            <div className="border-b border-border pb-4">
              <Link
                to="/teachers/$teacherId"
                params={{ teacherId: lead.id }}
                className="group flex items-center gap-3"
              >
                {lead.avatar_url ? (
                  <img
                    src={lead.avatar_url}
                    alt={lead.full_name}
                    className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-gold/50"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                    <UserRound className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">
                    {tr("Giảng viên phụ trách chính")}
                  </div>
                  <div className="font-semibold group-hover:text-primary">{lead.full_name}</div>
                  {lead.title && (
                    <div className="line-clamp-1 text-xs text-muted-foreground">{lead.title}</div>
                  )}
                </div>
              </Link>
              {(
                [
                  ["Giảng viên đồng hành", pickTeachers(teachers, st?.co_teacher_ids, lead.id)],
                  ["Trợ giảng", pickTeachers(teachers, st?.assistant_ids, lead.id)],
                ] as const
              ).map(
                ([label, list]) =>
                  list.length > 0 && (
                    <div key={label} className="mt-3">
                      <div className="text-xs text-muted-foreground">{tr(label)}</div>
                      <div className="mt-1.5 space-y-1.5">
                        {list.map((t) => (
                          <Link
                            key={t.id}
                            to="/teachers/$teacherId"
                            params={{ teacherId: t.id }}
                            className="flex items-center gap-2 text-sm hover:text-primary"
                          >
                            {t.avatar_url ? (
                              <img
                                src={t.avatar_url}
                                alt={t.full_name}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-primary">
                                <UserRound className="h-4 w-4" />
                              </span>
                            )}
                            <span className="font-medium">{t.full_name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ),
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {tr("Đồng giảng dạy cùng đội ngũ giảng viên TML")} ·{" "}
                <Link to="/teachers" className="font-semibold text-primary hover:underline">
                  {tr("Xem tất cả giảng viên →")}
                </Link>
              </p>
            </div>
          )}
          <Info
            icon={Clock}
            l="Số buổi / thời lượng"
            v={`${c.sessions} ${tr("buổi")} · ${c.duration}`}
          />
          <Info icon={CalendarDays} l="Lịch học" v={c.schedule} />
          <Info icon={Video} l="Hình thức" v={c.mode} />
          <Info
            icon={Users}
            l="Số lượng"
            v={`${tr("Lớp chọn lọc, tối đa")} ${c.capacity} ${tr("học viên")}`}
          />
          <Btn block />
          <p className="text-center text-xs text-muted-foreground">
            {tr("Lớp có xét duyệt · Không thanh toán online.")}
          </p>
        </aside>
      </div>
      {enroll && (
        <EnrollmentDialog
          level={enroll.level}
          classId={enroll.id}
          title={enroll.name}
          fee={classFee(enroll)}
          onClose={() => setEnroll(null)}
        />
      )}
    </>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  const tr = useTr();
  return (
    <div className="rounded-2xl bg-secondary p-6">
      <div className="font-bold text-primary-deep">{tr(title)}</div>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i} className="flex gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            {tr(i)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Info({ icon: I, l, v }: { icon: typeof Clock; l: string; v: string }) {
  const tr = useTr();
  return (
    <div className="flex gap-3 text-sm">
      <I className="mt-0.5 h-4 w-4 text-primary" />
      <div>
        <div className="text-xs text-muted-foreground">{tr(l)}</div>
        <div className="font-medium">{v}</div>
      </div>
    </div>
  );
}
