import type { ReactNode } from "react";

/**
 * Shared card used by the landing page "Bản tin & kiến thức" and "Đội ngũ
 * giảng viên" blocks: large cover, eyebrow, title, short description, meta.
 */
export function ContentCard({
  image,
  imageAlt,
  imageClassName = "",
  fallback,
  eyebrow,
  badge,
  title,
  description,
  meta,
  onClick,
}: {
  image?: string | undefined;
  imageAlt: string;
  imageClassName?: string;
  fallback: ReactNode;
  eyebrow: ReactNode;
  badge?: ReactNode | undefined;
  title: string;
  description?: string | undefined;
  meta?: ReactNode | undefined;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
    >
      {image ? (
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          className={`h-40 w-full object-cover ${imageClassName}`}
        />
      ) : (
        <div className="grid-lines flex h-40 items-center justify-center bg-accent">{fallback}</div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-primary">{eyebrow}</span>
          {badge}
        </div>
        <h3 className="mt-2 font-semibold">{title}</h3>
        {description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>
        )}
        {meta && <div className="mt-3 text-xs text-muted-foreground">{meta}</div>}
      </div>
    </button>
  );
}
