export type AccessLevel = "admin" | "department_head" | "deputy_head" | "member";

/** Access level from the user_roles list: admin first, then Trưởng Ban, Phó Ban, member. */
export function currentAccessOf(roles: string[]): AccessLevel {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("department_head")) return "department_head";
  if (roles.includes("deputy_head")) return "deputy_head";
  return "member";
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

/**
 * The legacy access role and the 14 legacy fine-grained permissions stay admin-only (the admin menu
 * and not-yet-migrated groups still read them). Returns a Vietnamese error, or null when allowed.
 */
export function legacyAccessChangeError(
  callerIsAdmin: boolean,
  current: { access: AccessLevel; permissions: string[] } | null, // null = creating an account
  next: { access: AccessLevel; permissions: string[] },
): string | null {
  if (callerIsAdmin) return null;
  if (!current) {
    return next.access === "member"
      ? null
      : "Chỉ Quản trị viên được cấp vai trò hệ thống khác Thành viên.";
  }
  if (next.access !== current.access) return "Chỉ Quản trị viên được đổi vai trò hệ thống.";
  if (!sameSet(next.permissions, current.permissions))
    return "Chỉ Quản trị viên được đổi quyền chi tiết cũ.";
  return null;
}
