import { can, type MyPermissions, type PermissionCode } from "./permission-catalog";

/** Each admin section opens when the user holds at least one of these actions (any scope). */
export const SECTION_ACTIONS: Record<string, readonly PermissionCode[]> = {
  recruitment: ["recruitment.config"],
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

/** Sections every admin-portal user gets once they can open at least one module. */
export const PERSONAL_SECTIONS = ["settings"] as const;

export function withPersonalSections(allowed: string[] | "all"): string[] | "all" {
  if (allowed === "all") return allowed;
  return [...allowed, ...PERSONAL_SECTIONS.filter((s) => !allowed.includes(s))];
}

/** true khi người dùng chỉ có các mục cá nhân (Cài đặt), không có module quản trị nào. */
export function onlyPersonalSections(allowed: string[] | "all"): boolean {
  if (allowed === "all") return false;
  return allowed.every((s) => (PERSONAL_SECTIONS as readonly string[]).includes(s));
}

/** Lands on /admin only when the user has real work there, not just the member list or settings. */
export function landsOnAdmin(allowed: string[] | "all"): boolean {
  if (allowed === "all") return true;
  return allowed.some(
    (s) => s !== "members" && !(PERSONAL_SECTIONS as readonly string[]).includes(s),
  );
}
