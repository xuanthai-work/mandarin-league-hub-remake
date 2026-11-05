import { createContext, useContext, type ReactNode } from "react";

export interface AdminHeaderContextValue {
  headerActions: ReactNode;
  setHeaderActions: (actions: ReactNode) => void;
  /** Extra breadcrumb levels after the current section, e.g. ["Viết bài mới"]. */
  crumbs: string[];
  setCrumbs: (crumbs: string[]) => void;
}

export const AdminHeaderContext = createContext<AdminHeaderContextValue | null>(null);

/** Page actions registered by `AdminPageHeader` and rendered in the admin top header. */
export function useAdminHeader() {
  return useContext(AdminHeaderContext);
}
