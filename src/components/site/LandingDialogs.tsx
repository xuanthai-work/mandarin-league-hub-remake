import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  CalendarDays,
  GraduationCap,
  Languages,
  MapPin,
  Users,
  Video,
  Wallet,
} from "lucide-react";

import { EnrollmentForm } from "@/components/courses/EnrollmentDialog";
import { ActivityRegisterBox } from "@/components/site/ActivityRegisterBox";
import { TeacherPhoto } from "@/components/site/TeacherCard";
import { VerificationLookup } from "@/components/verification/VerificationLookup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Course } from "@/lib/data/types";
import { classFee, fmtDate as fmtClassDate, type HskClass } from "@/lib/hsk-classes";
import {
  CATEGORY_LABEL,
  LIVE_LABEL,
  LOCATION_LABEL,
  fmtDateTime,
  liveStatus,
  type ActivityRow,
} from "@/lib/activities";
import { fmtDate as fmtNewsDate, type NewsRow } from "@/lib/news-db";
import { useTr } from "@/lib/i18n";
import {
  COURSE_ROLE_LABEL,
  TEACHER_TYPE_LABEL,
  teacherTags,
  useTeacherCourses,
  type PublicTeacher,
} from "@/lib/teachers";

function InfoLine({
  icon: Icon,
  children,
}: {
  icon: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{children}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Course                                                              */
/* ------------------------------------------------------------------ */

export function CourseDialog({
  course,
  cls,
  onClose,
}: {
  course: Course;
  cls?: HskClass | undefined;
  onClose: () => void;
}) {
  const tr = useTr();
  const level = cls?.level ?? course.level;
  const title = cls?.name ?? course.name;
  const description = cls?.description || course.description;
  const fee = cls ? classFee(cls) : course.fee;
  const format = cls ? cls.format : course.mode;
  const schedule = cls
    ? [
        cls.start_date
          ? `${fmtClassDate(cls.start_date)}${cls.end_date ? ` → ${fmtClassDate(cls.end_date)}` : ""}`
          : "",
        cls.schedule,
      ]
        .filter(Boolean)
        .join(" · ")
    : course.schedule;
  const duration = cls?.duration || course.duration;
  const full = cls ? (cls.seats ?? 0) >= cls.max_students : false;
  const canEnroll = !!cls && cls.status === "enrolling" && !full && !cls.registration_url;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              HSK {level}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {cls
                ? full
                  ? tr("Đã đủ sĩ số")
                  : tr(
                      {
                        enrolling: "Đang tuyển sinh",
                        upcoming: "Sắp khai giảng",
                        ongoing: "Đang diễn ra",
                        ended: "Đã kết thúc",
                      }[cls.status],
                    )
                : tr("Lộ trình chuẩn")}
            </span>
          </div>
          <DialogTitle className="mt-2 text-2xl font-bold text-primary-deep">{title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{description}</DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-2xl border border-border">
          {cls?.thumb ? (
            <img src={cls.thumb} alt={title} className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex aspect-[21/7] items-center justify-center bg-brand-gradient">
              <span className="text-4xl font-extrabold text-primary-foreground">HSK {level}</span>
            </div>
          )}
        </div>

        <div className="grid gap-3 rounded-2xl border border-border bg-secondary/50 p-4 text-sm sm:grid-cols-2">
          {schedule && <InfoLine icon={CalendarDays}>{schedule}</InfoLine>}
          <InfoLine icon={Video}>
            {tr(format)}
            {duration && ` · ${duration}`}
          </InfoLine>
          {cls && (
            <InfoLine icon={Users}>
              {cls.seats ?? 0}/{cls.max_students} {tr("học viên")}
            </InfoLine>
          )}
          <InfoLine icon={Wallet}>
            <b className="font-semibold text-primary-deep">{tr(fee)}</b>
          </InfoLine>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-primary-deep">
              <BookOpen className="h-4 w-4 text-primary" /> {tr("Lộ trình & giáo trình")}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {course.syllabus.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {tr(item)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-bold text-primary-deep">
              <Award className="h-4 w-4 text-primary" /> {tr("Kết quả đạt được")}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {course.outcomes.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {tr(item)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-5">
          <h3 className="text-lg font-bold text-primary-deep">{tr("Đăng ký lớp học")}</h3>
          {canEnroll && cls ? (
            <EnrollmentForm level={cls.level} classId={cls.id} onClose={onClose} />
          ) : cls?.registration_url && cls.status !== "ended" ? (
            <a
              href={cls.registration_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90"
            >
              {tr("Đăng ký lớp này")} <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted-foreground">
                {cls
                  ? tr(
                      "Lớp hiện không mở đăng ký trực tuyến. Vui lòng xem các lớp đang tuyển sinh.",
                    )
                  : tr(
                      "Chọn một lớp đang mở để đăng ký trực tiếp, hoặc xem toàn bộ lớp đang tuyển sinh.",
                    )}
              </p>
              <Link
                to="/courses/hsk"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90"
              >
                {tr("Xem lớp đang mở")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Teacher                                                             */
/* ------------------------------------------------------------------ */

export function TeacherDialog({
  teacher: t,
  onClose,
}: {
  teacher: PublicTeacher;
  onClose: () => void;
}) {
  const tr = useTr();
  const { data: courses } = useTeacherCourses(t.id);
  const tags = teacherTags(t);
  const certs = t.certificates
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogDescription className="sr-only">{tr("Hồ sơ giảng viên")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="mx-auto h-40 w-40 shrink-0 overflow-hidden rounded-2xl bg-secondary ring-2 ring-gold/60 ring-offset-2 ring-offset-background">
            <TeacherPhoto t={t} />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-2xl font-bold text-primary-deep">
              {t.full_name}
            </DialogTitle>
            {t.chinese_name && (
              <div className="text-base text-muted-foreground">{t.chinese_name}</div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {t.title && <span className="font-semibold text-primary">{t.title}</span>}
              <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">
                {tr(TEACHER_TYPE_LABEL[t.teacher_type])}
              </span>
            </div>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((x) => (
                  <span
                    key={x}
                    className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground"
                  >
                    {x}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_260px]">
          <div>
            <h3 className="font-bold text-primary-deep">{tr("Giới thiệu")}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {t.bio || tr("Đang cập nhật")}
            </p>
            {t.bio_zh && (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {t.bio_zh}
              </p>
            )}
            <h3 className="mt-6 font-bold text-primary-deep">{tr("Khóa học tham gia")}</h3>
            {(courses ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{tr("Đang cập nhật")}</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {courses!.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start gap-2 rounded-lg bg-secondary/60 p-2.5"
                  >
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      <span className="font-medium">{c.title}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {tr(COURSE_ROLE_LABEL[c.role])}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside className="h-fit space-y-3 rounded-xl border border-border p-4 text-sm">
            {t.specialty && (
              <InfoLine icon={GraduationCap}>
                <span className="block text-xs text-muted-foreground">{tr("Chuyên môn")}</span>
                {t.specialty}
              </InfoLine>
            )}
            {t.chinese_level && (
              <InfoLine icon={Languages}>
                <span className="block text-xs text-muted-foreground">
                  {tr("Trình độ Hán ngữ")}
                </span>
                {t.chinese_level}
              </InfoLine>
            )}
            {t.experience && (
              <InfoLine icon={Briefcase}>
                <span className="block text-xs text-muted-foreground">
                  {tr("Kinh nghiệm giảng dạy")}
                </span>
                {t.experience}
              </InfoLine>
            )}
            {certs.length > 0 && (
              <InfoLine icon={Award}>
                <span className="block text-xs text-muted-foreground">{tr("Chứng chỉ")}</span>
                <span className="whitespace-pre-line">{certs.join("\n")}</span>
              </InfoLine>
            )}
            {!t.specialty && !t.chinese_level && !t.experience && !certs.length && (
              <p className="text-muted-foreground">
                {tr("Thông tin chuyên môn đang được cập nhật.")}
              </p>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Activity                                                            */
/* ------------------------------------------------------------------ */

export function ActivityDialog({ a, onClose }: { a: ActivityRow; onClose: () => void }) {
  const tr = useTr();
  const s = LIVE_LABEL[liveStatus(a)];
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {tr(CATEGORY_LABEL[a.category])}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.tone}`}>
              {tr(s.label)}
            </span>
          </div>
          <DialogTitle className="mt-2 text-2xl font-bold text-primary-deep">{a.title}</DialogTitle>
          {a.short_description && (
            <DialogDescription className="leading-relaxed">{a.short_description}</DialogDescription>
          )}
        </DialogHeader>

        {a.banner ? (
          <img
            src={a.banner}
            alt={a.title}
            className="aspect-[21/9] w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="grid-lines flex aspect-[21/9] items-center justify-center rounded-2xl bg-accent">
            <CalendarDays className="h-12 w-12 text-primary/60" />
          </div>
        )}

        <div className="grid gap-3 rounded-2xl border border-border bg-secondary/50 p-4 text-sm sm:grid-cols-2">
          <InfoLine icon={CalendarDays}>
            {tr(fmtDateTime(a.start_time))}
            {a.end_time && ` → ${tr(fmtDateTime(a.end_time))}`}
          </InfoLine>
          <InfoLine icon={MapPin}>
            {tr(LOCATION_LABEL[a.location_type])}
            {a.location_detail && a.location_type !== "online" && ` · ${a.location_detail}`}
          </InfoLine>
          {a.registration_deadline && (
            <InfoLine icon={CalendarDays}>
              {tr("Hạn đăng ký")}: {tr(fmtDateTime(a.registration_deadline))}
            </InfoLine>
          )}
          {a.max_participants > 0 && (
            <InfoLine icon={Users}>
              {tr("Tối đa")} {a.max_participants} {tr("người")}
            </InfoLine>
          )}
        </div>

        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {a.description}
        </p>

        <div className="rounded-2xl border border-border p-5">
          <h3 className="font-bold text-primary-deep">{tr("Đăng ký tham gia")}</h3>
          <ActivityRegisterBox a={a} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* News                                                                */
/* ------------------------------------------------------------------ */

export function NewsDialog({ article: n, onClose }: { article: NewsRow; onClose: () => void }) {
  const tr = useTr();
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <DialogHeader>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {n.category}
          </span>
          <DialogTitle className="mt-2 text-2xl font-bold text-primary-deep">{n.title}</DialogTitle>
          <DialogDescription>
            {n.author_name} · {fmtNewsDate(n.published_at)}
          </DialogDescription>
        </DialogHeader>
        {n.cover && (
          <img src={n.cover} alt={n.title} className="max-h-80 w-full rounded-2xl object-cover" />
        )}
        {n.summary && <p className="text-base font-medium">{n.summary}</p>}
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          {n.content.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="border-t border-border pt-4 text-center">
          <Link
            to="/news/$slug"
            params={{ slug: n.slug }}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {tr("Mở trang bài viết")}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Verification                                                        */
/* ------------------------------------------------------------------ */

export function VerifyDialog({
  kind,
  onClose,
}: {
  kind: "certificate" | "hsk";
  onClose: () => void;
}) {
  const tr = useTr();
  const isHsk = kind === "hsk";
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary-deep">
            {isHsk ? tr("Xác minh kết quả HSK") : tr("Xác minh chứng nhận")}
          </DialogTitle>
          <DialogDescription>
            {isHsk
              ? tr("Nhập mã xác minh kèm họ tên thí sinh để tra cứu kết quả được TML ghi nhận.")
              : tr("Nhập mã chứng nhận kèm họ tên người nhận để kiểm tra tính xác thực.")}
          </DialogDescription>
        </DialogHeader>
        <VerificationLookup kind={kind} compact />
        <div className="border-t border-border pt-4 text-center">
          <Link
            to={isHsk ? "/verify/hsk" : "/verify/certificate"}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {tr("Mở trang xác minh đầy đủ")}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
