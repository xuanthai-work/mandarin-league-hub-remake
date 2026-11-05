import type { AdminRole } from "./admin-nav";

/** Admin sections a user may see. RLS enforces the same rules on the backend. */
export function allowedSections(
  roles: AdminRole[],
  department: string | null,
  permissions: string[] = [],
): string[] | "all" {
  if (roles.includes("admin")) return "all";
  const isHead = roles.includes("department_head") || roles.includes("deputy_head");
  const s = new Set<string>();
  if (isHead) ["members", "tasks", "contributions"].forEach((x) => s.add(x));
  // The fine-grained member permission opens the members section on its own (profile data only).
  if (permissions.includes("members.edit")) s.add("members");
  if (department === "comms") ["news", "activities"].forEach((x) => s.add(x));
  if (department === "comms" && isHead) s.add("content");
  if (canViewPartners(roles, department)) s.add("partners");
  return [...s];
}

export const canReviewNews = (roles: AdminRole[], department: string | null) =>
  roles.includes("admin") ||
  (department === "comms" && (roles.includes("department_head") || roles.includes("deputy_head")));

/** Departments that read the partner list for their own work but never edit it. */
const PARTNER_VIEW_DEPARTMENTS = ["finance", "comms", "design", "translation"];

/** Full partner CRUD (create, edit, hide/show, delete) — admin only. */
export const canManagePartners = (roles: AdminRole[], department: string | null) =>
  roles.includes("admin");

/** Read-only partner access: managers plus the departments that reuse partner info and logos. */
export const canViewPartners = (roles: AdminRole[], department: string | null) =>
  canManagePartners(roles, department) ||
  (department !== null && PARTNER_VIEW_DEPARTMENTS.includes(department));
