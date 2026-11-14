import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock, Users, Video, Wallet } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { SectionLabel } from "@/components/site/ui";
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
import type { HomeContent } from "@/lib/site-content";

export function CoursesSection({
  h,
  onSelectCourse,
}: {
  h: HomeContent;
  onSelectCourse: (selection: { course: Course; cls?: HskClass }) => void;
}) {
  const tr = useTr();
  const [courseLevel, setCourseLevel] = useState(0);

  const classQuery = usePublishedClasses();
  const allClasses = classQuery.data ?? [];
  const openLevels = new Set(
    allClasses.filter((c) => c.status === "enrolling").map((c) => c.level),
  );

  const classes = allClasses.filter((c) => !courseLevel || c.level === courseLevel);
  const roadmap = getCourses().filter((c) => !courseLevel || c.level === courseLevel);

  const openClass = (c: HskClass) => {
    const course = getCourse(`hsk-${c.level}`);
    if (course) onSelectCourse({ course, cls: c });
  };

  return (
    <section id="courses" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 reveal-on-scroll">
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

      <div className="mt-8 flex flex-wrap items-center gap-2 reveal-on-scroll">
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
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 reveal-on-scroll">
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
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 reveal-on-scroll">
          {roadmap.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCourse({ course: c })}
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
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{tr(c.description)}</p>
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
  );
}
