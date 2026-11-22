import { ArrowRight } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { EmptyState, SectionLabel } from "@/components/site/ui";
import { TeacherPhotoCard } from "@/components/site/TeacherPhotoCard";
import { usePublicTeachers, type PublicTeacher } from "@/lib/teachers";
import { appendPreview, usePreviewMode, type HomeContent } from "@/lib/site-content";
import { CtaLink } from "@/components/site/CtaLink";

export function TeachersSection({
  h,
  onSelectTeacher,
}: {
  h: HomeContent;
  onSelectTeacher: (teacher: PublicTeacher) => void;
}) {
  const tr = useTr();
  const preview = usePreviewMode();
  const visibleTeachers = usePublicTeachers().data ?? [];
  const pickedTeachers = visibleTeachers.filter((x) => x.show_on_home);
  const faculty = (pickedTeachers.length ? pickedTeachers : visibleTeachers).slice(0, 6);

  return (
    <section id="teachers" className="scroll-mt-24 border-t border-border py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 reveal-on-scroll">
          <div>
            <SectionLabel>师资团队 · {tr("Đội ngũ Giảng viên")}</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">
              {h.teachers_section_title || tr("ĐỘI NGŨ GIẢNG VIÊN")}
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {h.teachers_section_desc ||
                tr(
                  "Đội ngũ giáo viên đồng hành cùng người học trên hành trình chinh phục tiếng Trung, phát triển năng lực ngôn ngữ và mở rộng cơ hội học tập.",
                )}
            </p>
          </div>
          <CtaLink
            href={appendPreview(h.teachers_cta_url || "/teachers", preview)}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            {h.teachers_cta_label || tr("Xem tất cả các giảng viên")}{" "}
            <ArrowRight className="h-4 w-4" />
          </CtaLink>
        </div>
        {faculty.length === 0 ? (
          <div className="mt-10 reveal-on-scroll">
            <EmptyState
              title={tr("Đang cập nhật")}
              desc={tr("Đội ngũ giảng viên sẽ sớm được giới thiệu.")}
            />
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 reveal-on-scroll">
            {faculty.map((x) => (
              <TeacherPhotoCard key={x.id} teacher={x} onClick={() => onSelectTeacher(x)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
