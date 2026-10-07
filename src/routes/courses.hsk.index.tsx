import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, Users, Video, CalendarDays, Wallet, UserRound } from "lucide-react";
import { PageHero } from "@/components/site/SiteLayout";
import { Chips, DemoBadge, EmptyState, SectionTitle, StatusBadge } from "@/components/site/ui";
import { getCourses } from "@/lib/data/courses";
import type { CourseStatus } from "@/lib/data/types";
import { pageMeta } from "@/lib/seo";
import { usePublicTeachers, teachersForLevel } from "@/lib/teachers";

export const Route = createFileRoute("/courses/hsk/")({
  head: () => ({ meta: pageMeta("Khóa học HSK", "Khóa học HSK 1–6 trực tuyến cùng đội ngũ giáo viên TML.") }),
  component: PCourses,
});

const LEVELS = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"] as const;
const FILTER_STATUS: CourseStatus[] = ["Đang tuyển sinh", "Sắp khai giảng", "Đã đủ lớp"];

function PCourses() {
  const courses = getCourses();
  const { data: teachers } = usePublicTeachers();
  const [level, setLevel] = useState<(typeof LEVELS)[number] | "all">("all");
  const [status, setStatus] = useState<CourseStatus | "all">("all");
  const filtered = courses.filter((c) => (level === "all" || `HSK ${c.level}` === level) && (status === "all" || c.status === status));

  return (
    <>
      <PageHero eyebrow="Khóa học HSK" title="Lộ trình HSK 1–6" desc="Học online qua Zoom, lộ trình rõ ràng từ nhập môn đến cao cấp." />
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} to="/courses/hsk/$courseId" params={{ courseId: c.id }} className="flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-lg bg-brand-gradient px-3 py-1 text-sm font-bold text-primary-foreground">HSK {c.level}</span>
                <div className="flex items-center gap-2">{c.demo && <DemoBadge />}<StatusBadge status={c.status} /></div>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{c.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><Clock className="h-4 w-4" />{c.sessions} buổi</span>
                <span className="flex items-center gap-2"><Video className="h-4 w-4" />{c.mode}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-secondary py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionTitle label="Lớp học" title="Lớp học cùng giáo viên" />
          <div className="mt-6 space-y-3">
            <Chips items={[...LEVELS]} value={level} onChange={setLevel} />
            <Chips items={FILTER_STATUS} value={status} onChange={setStatus} allLabel="Mọi trạng thái" />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {filtered.length === 0 && <div className="md:col-span-2"><EmptyState title="Không có lớp phù hợp" desc="Hãy thử bộ lọc khác." /></div>}
            {filtered.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary"><UserRound className="h-6 w-6" /></div>
                    <div><div className="font-semibold">{teachersForLevel(teachers, c.level).map((t) => t.full_name).join(", ") || "Giáo viên: Đang cập nhật"}</div><div className="text-xs text-muted-foreground">HSK {c.level} · {c.name}</div></div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{c.schedule}</span>
                  <span className="flex items-center gap-2"><Video className="h-4 w-4" />{c.mode}</span>
                  <span className="flex items-center gap-2"><Wallet className="h-4 w-4" />{c.fee}</span>
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" />Tối đa {c.capacity} học viên</span>
                </div>
                <Link to="/courses/hsk/$courseId" params={{ courseId: c.id }} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Xem chi tiết →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
