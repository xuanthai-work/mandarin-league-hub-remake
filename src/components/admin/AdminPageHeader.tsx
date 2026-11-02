import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/** One page header for every admin screen: same title rhythm, same left edge, actions on the right. */
export function AdminPageHeader({ title, description, actions, className = "" }: AdminPageHeaderProps) {
  return (
    <div className={`mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border/50 pb-5 sm:mb-8 ${className}`}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
