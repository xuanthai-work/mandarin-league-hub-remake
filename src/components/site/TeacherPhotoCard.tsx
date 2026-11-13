import { UserRound } from "lucide-react";

import { useTr } from "@/lib/i18n";
import { teacherTags, TEACHER_TYPE_LABEL, type PublicTeacher } from "@/lib/teachers";
import { PhotoOverlayCard } from "./PhotoOverlayCard";

/** Teacher photo card built on the shared PhotoOverlayCard used by news too. */
export function TeacherPhotoCard({
  teacher,
  onClick,
}: {
  teacher: PublicTeacher;
  onClick: () => void;
}) {
  const tr = useTr();
  const tags = teacherTags(teacher).slice(0, 4);

  return (
    <PhotoOverlayCard
      image={teacher.avatar_url}
      imageAlt={teacher.full_name}
      imageClassName="object-[center_30%]"
      fallback={<UserRound className="h-16 w-16" />}
      eyebrow={tr(TEACHER_TYPE_LABEL[teacher.teacher_type])}
      title={teacher.full_name}
      titleExtra={teacher.chinese_name || undefined}
      subtitle={[teacher.title, teacher.specialty].filter(Boolean).join(" · ") || undefined}
      description={teacher.bio || undefined}
      meta={
        tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : undefined
      }
      actionLabel={tr("Xem chi tiết hồ sơ")}
      onClick={onClick}
    />
  );
}
