import { useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

/**
 * Full-bleed photo card used by the landing page for both teachers and news.
 * The image fills the whole (unchanged) card frame; hovering on desktop or
 * tapping once on touch slides a glass info panel up over the photo.
 */
export function PhotoOverlayCard({
  image,
  imageAlt,
  imageClassName = "",
  aspectClassName = "aspect-[9/7]",
  fallback,
  eyebrow,
  badge,
  title,
  titleExtra,
  subtitle,
  description,
  meta,
  actionLabel,
  onClick,
  ariaLabel,
}: {
  image?: string | undefined;
  imageAlt: string;
  imageClassName?: string;
  /** Card frame ratio; defaults to the landscape frame used by news. */
  aspectClassName?: string;
  fallback: ReactNode;
  eyebrow: ReactNode;
  badge?: ReactNode | undefined;
  title: string;
  titleExtra?: string | undefined;
  subtitle?: string | undefined;
  description?: string | undefined;
  meta?: ReactNode;
  actionLabel?: string | undefined;
  onClick: () => void;
  ariaLabel?: string | undefined;
}) {
  const [revealed, setRevealed] = useState(false);

  const handleClick = () => {
    const canHover = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;
    if (canHover || revealed) {
      onClick();
      return;
    }
    setRevealed(true);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel ?? title}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative ${aspectClassName} w-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-300 hover:border-primary/50 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      {image ? (
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`}
        />
      ) : (
        <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-accent text-primary/60">
          {fallback}
        </div>
      )}

      {/* Resting state: name/category over a bottom gradient. */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 pt-14 transition-opacity duration-300 group-hover:opacity-0 group-focus-within:opacity-0 ${
          revealed ? "opacity-0" : ""
        }`}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </span>
        <h3 className="mt-1 line-clamp-2 text-xl font-bold text-white">
          {title}
          {titleExtra && (
            <span className="ml-2 font-han text-base font-normal text-white/80">{titleExtra}</span>
          )}
        </h3>
        {subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-white/75">{subtitle}</p>}
      </div>

      {/* Hover/focus/tap state: glass panel slides up over the photo. */}
      <div
        className={`absolute inset-x-0 bottom-0 z-10 flex max-h-[85%] translate-y-full flex-col justify-end border-t border-border/50 bg-card/95 p-5 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0 ${
          revealed ? "translate-y-0" : ""
        }`}
      >
        <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-muted-foreground/30" />

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {eyebrow}
          </span>
          {badge}
        </div>

        <h3 className="mt-1 line-clamp-2 text-lg font-bold text-foreground">
          {title}
          {titleExtra && (
            <span className="ml-2 font-han text-base font-normal text-muted-foreground">
              {titleExtra}
            </span>
          )}
        </h3>

        {subtitle && (
          <p className="mt-0.5 line-clamp-1 text-xs font-medium text-muted-foreground">
            {subtitle}
          </p>
        )}

        {meta && <div className="mt-2 text-xs text-muted-foreground">{meta}</div>}

        {description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}

        {actionLabel && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <span>{actionLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        )}
      </div>
    </div>
  );
}
