import { Link } from "@tanstack/react-router";
import { ArrowRight, UserRound } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { teacherTags, type PublicTeacher } from "@/lib/teachers";

export function TeacherPhoto({
  t,
  className = "",
}: {
  t: Pick<PublicTeacher, "avatar_url" | "full_name">;
  className?: string;
}) {
  return t.avatar_url ? (
    <img
      src={t.avatar_url}
      alt={t.full_name}
      loading="lazy"
      className={`h-full w-full object-cover ${className}`}
    />
  ) : (
    <div
      className={`flex h-full w-full items-center justify-center bg-accent text-primary/50 ${className}`}
    >
      <UserRound className="h-12 w-12" />
    </div>
  );
}

/** Medium homepage card: readable teacher portrait without the full directory size. */
export function TeacherCardMid({
  t,
  onSelect,
}: {
  t: PublicTeacher;
  onSelect?: (t: PublicTeacher) => void;
}) {
  const tr = useTr();
  const tags = teacherTags(t).slice(0, 3);
  const body = (
    <>
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-secondary ring-1 ring-gold/50 ring-offset-2 ring-offset-card">
        <TeacherPhoto t={t} className="transition duration-500 group-hover:scale-[1.04]" />
      </div>
      <h3 className="mt-4 text-lg font-bold leading-snug text-primary-deep">{t.full_name}</h3>
      {t.chinese_name && <div className="text-sm text-muted-foreground">{t.chinese_name}</div>}
      <div className="mt-1 line-clamp-1 text-sm font-medium text-primary">
        {t.title || tr("Giảng viên")}
      </div>
      {t.specialty && (
        <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{t.specialty}</div>
      )}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
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
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        {tr("Xem hồ sơ")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </>
  );
  const className =
    "group flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center transition duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-lg hover:shadow-primary/10 md:p-6";
  if (onSelect)
    return (
      <button type="button" onClick={() => onSelect(t)} className={`${className} w-full`}>
        {body}
      </button>
    );
  return (
    <Link to="/teachers/$teacherId" params={{ teacherId: t.id }} className={className}>
      {body}
    </Link>
  );
}

/** Portrait card used on the teacher directory. */
export function TeacherCard({ t, role }: { t: PublicTeacher; role?: string }) {
  const tr = useTr();
  const tags = teacherTags(t).slice(0, 4);
  return (
    <Link
      to="/teachers/$teacherId"
      params={{ teacherId: t.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-lg hover:shadow-primary/10"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
        <TeacherPhoto t={t} className="transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gold/80" />
        {t.is_featured && (
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-0.5 text-[11px] font-semibold text-primary-deep">
            ★ {tr("Nổi bật")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-primary-deep">
          {t.full_name}
          {t.chinese_name && (
            <span className="ml-2 text-base font-medium text-muted-foreground">
              {t.chinese_name}
            </span>
          )}
        </h3>
        <div className="mt-0.5 text-sm font-medium text-primary">
          {role ?? (t.title || tr("Giảng viên"))}
        </div>
        {t.specialty && <div className="mt-1 text-xs text-muted-foreground">{t.specialty}</div>}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((x) => (
              <span
                key={x}
                className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground"
              >
                {x}
              </span>
            ))}
          </div>
        )}
        {t.bio && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{t.bio}</p>}
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary">
          {tr("Xem hồ sơ")}{" "}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
