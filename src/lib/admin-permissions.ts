import {
  can,
  outranksPosition,
  type MyPermissions,
  type PermissionCode,
} from "./permission-catalog";

/** Each admin section opens when the user holds at least one of these actions (any scope). */
export const SECTION_ACTIONS: Record<string, readonly PermissionCode[]> = {
  recruitment: ["recruitment.view", "recruitment.create", "recruitment.edit", "questions.edit"],
  candidates: ["candidates.view"],
  members: ["members.view"],
  tasks: ["tasks.view"],
  contributions: ["points.view", "points.attendance", "points.adjust"],
  benefits: ["benefits.manage"],
  courses: ["courses.manage", "enrollments.view", "enrollments.review"],
  teachers: ["teachers.manage"],
  hsk: ["hsk.view", "hsk.manage", "hsk.delete"],
  certificates: ["certificates.manage"],
  activities: ["activities.draft", "activities.publish", "activities.registrations"],
  news: ["news.write", "news.review"],
  photos: ["photos.manage"],
  partners: ["partners.view", "partners.manage"],
  departments: ["departments.advisors"],
  content: ["content.edit", "content.publish"],
};

/** Admin sections a user may see. RLS enforces the same rules on the backend. */
export function allowedSections(p: MyPermissions): string[] | "all" {
  if (p.isAdmin) return "all";
  return Object.entries(SECTION_ACTIONS)
    .filter(([, codes]) => codes.some((c) => can(p, c)))
    .map(([slug]) => slug);
}

/** Sections every active member account gets: own tasks, the league leaderboard, settings. */
export const PERSONAL_SECTIONS = ["tasks", "contributions", "settings"] as const;

export function withPersonalSections(allowed: string[] | "all"): string[] | "all" {
  if (allowed === "all") return allowed;
  return [...allowed, ...PERSONAL_SECTIONS.filter((s) => !allowed.includes(s))];
}

/** true khi người dùng chỉ có các mục cá nhân (Nhiệm vụ của mình + Điểm đóng góp + Cài đặt), không có module quản trị nào. */
export function onlyPersonalSections(allowed: string[] | "all"): boolean {
  if (allowed === "all") return false;
  return allowed.every((s) => (PERSONAL_SECTIONS as readonly string[]).includes(s));
}

/** true when the user holds `code` organisation-wide (admin flag or scope "all"). */
export function hasAllScope(p: MyPermissions, code: PermissionCode): boolean {
  return p.isAdmin || p.actions[code] === "all";
}

/**
 * Client mirror of adjust_points' bonus/penalty rule: points.adjust for the target's department
 * and a strictly higher position. The database re-checks (including admin-flag targets).
 */
export function canAdjustMember(
  p: MyPermissions,
  me: { department: string | null; position: string | null },
  target: { department: string; position: string | null },
): boolean {
  if (p.isAdmin) return true;
  if (!can(p, "points.adjust", target.department, me.department)) return false;
  return outranksPosition(me.position ?? "Thành viên", target.position ?? "Thành viên");
}

type Me = { department: string | null; position: string | null };

/**
 * Client mirror of has_perm(code, target department) + outranks(): the admin flag passes; nobody
 * else may act on an admin or on an equal/higher position. The database re-checks everything.
 */
export function canActOnMember(
  p: MyPermissions,
  code: PermissionCode,
  me: Me,
  target: { department: string; position: string | null; isAdmin?: boolean },
): boolean {
  if (p.isAdmin) return true;
  if (target.isAdmin) return false;
  if (!can(p, code, target.department, me.department)) return false;
  return outranksPosition(me.position ?? "Thành viên", target.position ?? "Thành viên");
}

/** Departments (from `all`, in order) where the caller holds `code`, e.g. members.create / members.position. */
export function departmentsFor(
  p: MyPermissions,
  code: PermissionCode,
  me: Me,
  all: readonly string[],
): string[] {
  return all.filter((d) => can(p, code, d, me.department));
}

/** Positions the caller may assign: client mirror of can_assign_position (strictly lower rank). */
export function assignablePositions(
  p: MyPermissions,
  me: Me,
  positions: readonly string[],
): string[] {
  if (p.isAdmin) return [...positions];
  return positions.filter((x) => outranksPosition(me.position ?? "Thành viên", x));
}

/** Lands on /admin only when the user has real work there, not just the member list or settings. */
export function landsOnAdmin(allowed: string[] | "all"): boolean {
  if (allowed === "all") return true;
  return allowed.some((s) => s !== "members" && s !== "settings");
}
