import { Fragment } from "react";
import { Link } from "@tanstack/react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useTr } from "@/lib/i18n";

export type CrumbTo =
  | "/about"
  | "/community"
  | "/partners"
  | "/organization"
  | "/courses"
  | "/courses/hsk"
  | "/activities"
  | "/news"
  | "/verify"
  | "/verify/hsk"
  | "/verify/certificate"
  | "/teachers"
  | "/join"
  | "/ai-tutor"
  | "/library-access";

export type Crumb = { label: string; to?: CrumbTo };

/** Home > group > page. Non-link group labels are rendered as plain text. */
export function PageBreadcrumb({
  items = [],
  className = "",
}: {
  items?: Crumb[];
  className?: string;
}) {
  const tr = useTr();
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">{tr("Trang chủ")}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((crumb, i) => (
          <Fragment key={`${crumb.label}-${i}`}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.to ? (
                i < items.length - 1 ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to}>{tr(crumb.label)}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{tr(crumb.label)}</BreadcrumbPage>
                )
              ) : i < items.length - 1 ? (
                <span className="text-muted-foreground">{tr(crumb.label)}</span>
              ) : (
                <BreadcrumbPage>{tr(crumb.label)}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Slim bordered bar used above a page hero. */
export function BreadcrumbBar({ items }: { items: Crumb[] }) {
  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
        <PageBreadcrumb items={items} />
      </div>
    </div>
  );
}
