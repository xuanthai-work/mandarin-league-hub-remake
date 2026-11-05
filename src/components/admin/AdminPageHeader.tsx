import { useEffect, type ReactNode } from "react";
import { useAdminHeader } from "@/components/admin/admin-header-context";

interface AdminPageHeaderProps {
  /** Kept for backward compatibility: the module title now lives in the admin top header. */
  title?: string;
  /** Kept for backward compatibility: descriptions are no longer rendered in the page body. */
  description?: string;
  actions?: ReactNode;
  crumbs?: string[];
  className?: string;
}

/**
 * Pages keep declaring their actions here; the component ports them to the admin top header
 * and renders nothing in the page body, so tables and filters start right under the header.
 */
export function AdminPageHeader({ actions, crumbs }: AdminPageHeaderProps) {
  const header = useAdminHeader();
  const setHeaderActions = header?.setHeaderActions;
  const setCrumbs = header?.setCrumbs;
  const crumbsKey = (crumbs ?? []).join("\u0000");

  useEffect(() => {
    setHeaderActions?.(actions ?? null);
    return () => setHeaderActions?.(null);
  }, [actions, setHeaderActions]);

  useEffect(() => {
    setCrumbs?.(crumbsKey ? crumbsKey.split("\u0000") : []);
    return () => setCrumbs?.([]);
  }, [crumbsKey, setCrumbs]);

  return null;
}
