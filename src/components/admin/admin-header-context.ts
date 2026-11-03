import { createContext, useContext, type ReactNode } from "react";

export interface AdminHeaderContextValue {
  headerActions: ReactNode;
  setHeaderActions: (actions: ReactNode) => void;
}

export const AdminHeaderContext = createContext<AdminHeaderContextValue | null>(null);

/** Page actions registered by `AdminPageHeader` and rendered in the admin top header. */
export function useAdminHeader() {
  return useContext(AdminHeaderContext);
}
