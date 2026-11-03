import { useMemo, useState, type ReactNode } from "react";
import { AdminHeaderContext } from "@/components/admin/admin-header-context";

/** Shares page-level actions with the admin top header. */
export function AdminHeaderProvider({ children }: { children: ReactNode }) {
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const value = useMemo(() => ({ headerActions, setHeaderActions }), [headerActions]);
  return <AdminHeaderContext.Provider value={value}>{children}</AdminHeaderContext.Provider>;
}
