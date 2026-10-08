import type { AdminRole } from "./admin-nav";

/** Admin sections a user may see. RLS enforces the same rules on the backend. */
export function allowedSections(roles: AdminRole[], department: string | null): string[] | "all" {
  if (roles.includes("admin")) return "all";
  const isHead = roles.includes("department_head") || roles.includes("deputy_head");
  const s = new Set<string>();
  if (isHead) ["members", "tasks", "contributions"].forEach((x) => s.add(x));
  if (department === "comms") ["news", "activities", "partners"].forEach((x) => s.add(x));
  if (department === "finance") s.add("partners");
  return [...s];
}

export const canReviewNews = (roles: AdminRole[], department: string | null) =>
  roles.includes("admin") || (department === "comms" && (roles.includes("department_head") || roles.includes("deputy_head")));

export const canManagePartners = (roles: AdminRole[], department: string | null) =>
  roles.includes("admin") || department === "finance";
