import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, BookOpen, Briefcase, GraduationCap, Languages } from "lucide-react";
import { EmptyState } from "@/components/site/ui";
import { TeacherPhoto } from "@/components/site/TeacherCard";
import { useTr } from "@/lib/i18n";
import {
  COURSE_ROLE_LABEL,
  TEACHER_TYPE_LABEL,
  teacherTags,
  usePublicTeacher,
  useTeacherCourses,
} from "@/lib/teachers";

export const Route = createFileRoute("/teachers/$teacherId")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Hồ sơ giảng viên | The Mandarin League" },
      {
        name: "description",
        content:
          "Hồ sơ giảng viên của Liên Đoàn Hán Ngữ: chuyên môn, cấp độ giảng dạy và các khóa học tham gia.",
      },
      { property: "og:title", content: "Hồ sơ giảng viên | The Mandarin League" },
      {
        property: "og:description",
        content:
          "Hồ sơ giảng viên của Liên Đoàn Hán Ngữ: chuyên môn, cấp độ giảng dạy và các khóa học tham gia.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherProfile,
});

function TeacherProfile() {
  const tr = useTr();
  const { teacherId } = Route.useParams();
  const { data: t, isLoading } = usePublicTeacher(teacherId);
  const { data: courses } = useTeacherCourses(teacherId);
  if (isLoading)
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center text-muted-foreground">
        {tr("Đang tải…")}
      </div>
    );
  if (!t)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          title="Không tìm thấy hồ sơ"
          desc="Hồ sơ không tồn tại hoặc chưa được công khai."
        />
        <div className="mt-6 text-center">
          <Link to="/teachers" className="font-semibold text-primary">
            ← {tr("Đội ngũ Giảng viên")}
          </Link>
        </div>
      </div>
    );
  const tags = teacherTags(t);
  const certs = t.certificates
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  return (
    <>
      <section className="grid-lines border-b border-border bg-secondary">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[280px_1fr] md:items-center md:px-6">
          <div className="mx-auto aspect-[4/5] w-56 overflow-hidden rounded-2xl border-4 border-background shadow-xl ring-1 ring-gold/50 md:w-full">
            <TeacherPhoto t={t} />
          </div>
          <div>
            <Link to="/teachers" className="text-sm font-medium text-primary">
              ← {tr("Đội ngũ Giảng viên")}
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-primary-deep md:text-5xl">{t.full_name}</h1>
            {t.chinese_name && (
              <div className="mt-1 text-xl text-muted-foreground">{t.chinese_name}</div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {t.title && <span className="font-semibold text-primary">{t.title}</span>}
              <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">
                {tr(TEACHER_TYPE_LABEL[t.teacher_type])}
              </span>
            </div>
            {tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((x) => (
                  <span
                    key={x}
                    className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-primary-deep"
                  >
                    {x}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:px-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-primary-deep">{tr("Giới thiệu")}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
              {t.bio || tr("Đang cập nhật")}
            </p>
            {t.bio_zh && (
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
                {t.bio_zh}
              </p>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary-deep">{tr("Khóa học tham gia")}</h2>
            {(courses ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{tr("Đang cập nhật")}</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {courses!.map((c) => (
                  <Link
                    key={c.id}
                    to="/courses/$slug"
                    params={{ slug: c.slug }}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
                  >
                    <BookOpen className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <div className="font-semibold">{c.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {tr(COURSE_ROLE_LABEL[c.role])}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6">
          {t.specialty && <Info icon={GraduationCap} l={tr("Chuyên môn")} v={t.specialty} />}
          {t.chinese_level && (
            <Info icon={Languages} l={tr("Trình độ Hán ngữ")} v={t.chinese_level} />
          )}
          {t.experience && (
            <Info icon={Briefcase} l={tr("Kinh nghiệm giảng dạy")} v={t.experience} />
          )}
          {certs.length > 0 && <Info icon={Award} l={tr("Chứng chỉ")} v={certs.join("\n")} />}
          {!t.specialty && !t.chinese_level && !t.experience && !certs.length && (
            <p className="text-sm text-muted-foreground">
              {tr("Thông tin chuyên môn đang được cập nhật.")}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

function Info({ icon: I, l, v }: { icon: typeof Award; l: string; v: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <I className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <div className="text-xs text-muted-foreground">{l}</div>
        <div className="whitespace-pre-line font-medium">{v}</div>
      </div>
    </div>
  );
}
