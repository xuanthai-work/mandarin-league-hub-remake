import { useMemo, useState, type ReactNode } from "react";
import { AdminHeaderContext } from "@/components/admin/admin-header-context";

/** Shares page-level actions and crumbs with the admin top header. */
export function AdminHeaderProvider({ children }: { children: ReactNode }) {
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const [crumbs, setCrumbs] = useState<string[]>([]);
  const value = useMemo(
    () => ({ headerActions, setHeaderActions, crumbs, setCrumbs }),
    [headerActions, crumbs],
  );
  return <AdminHeaderContext.Provider value={value}>{children}</AdminHeaderContext.Provider>;
}
