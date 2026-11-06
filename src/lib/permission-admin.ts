import {
  PERMISSION_ACTIONS,
  type PermissionCode,
  type PermissionScope,
} from "./permission-catalog";
import { deptName } from "./recruitment";

/** Module headings of the matrix, in catalog order. Every module in PERMISSION_ACTIONS must be here. */
export const MODULE_LABELS: Record<string, string> = {
  recruitment: "Tuyển dụng",
  members: "Thành viên & tài khoản",
  tasks: "Nhiệm vụ",
  points: "Điểm đóng góp",
  benefits: "Quyền lợi",
  departments: "Ban",
  courses: "Khóa học",
  academic: "Học thuật",
  activities: "Hoạt động",
  news: "Tin tức",
  photos: "Hình ảnh",
  partners: "Đối tác",
  content: "Trang & Nội dung",
  trash: "Thùng rác",
};

export type ActionMeta = (typeof PERMISSION_ACTIONS)[number];
export type ActionGroup = { module: string; label: string; actions: ActionMeta[] };

/** Actions grouped by module, keeping catalog order for both modules and actions. */
export function actionGroups(): ActionGroup[] {
  const groups: ActionGroup[] = [];
  for (const a of PERMISSION_ACTIONS) {
    const group = groups.find((x) => x.module === a.module);
    if (group) group.actions.push(a);
    else
      groups.push({
        module: a.module,
        label: MODULE_LABELS[a.module] ?? a.module,
        actions: [a],
      });
  }
  return groups;
}

export const ALL_DEPARTMENTS_KEY = "*";
export const ORDINARY_POSITIONS = [
  "Trưởng Ban",
  "Phó Ban",
  "Thành viên",
  "Cố vấn chuyên môn",
] as const;
export const EXECUTIVE_POSITIONS = ["Co-founder", "Thư ký"] as const;

/** Matrix columns of a department tab (mirrors the CHECK constraint of position_permissions). */
export function positionsFor(department: string): readonly string[] {
  return department === "executive" ? EXECUTIVE_POSITIONS : ORDINARY_POSITIONS;
}

export function departmentLabel(department: string): string {
  return department === ALL_DEPARTMENTS_KEY ? "Tất cả các ban" : deptName(department);
}

export function scopeLabel(scope: PermissionScope | null, scoped: boolean): string {
  if (!scope) return "Không";
  if (!scoped) return "Có";
  return scope === "own" ? "Ban mình" : "Toàn bộ";
}

export type MatrixRow = {
  department: string;
  position: string;
  action: string;
  scope: PermissionScope;
};

/**
 * Scope stored for this exact department/position/action, plus what the "*" tab already gives
 * (only for ordinary departments). The effective permission is the wider of the two.
 */
export function cellState(
  rows: MatrixRow[],
  department: string,
  position: string,
  action: PermissionCode,
): { own: PermissionScope | null; inherited: PermissionScope | null } {
  const own =
    rows.find((r) => r.department === department && r.position === position && r.action === action)
      ?.scope ?? null;
  const inherited =
    department === ALL_DEPARTMENTS_KEY || department === "executive"
      ? null
      : (rows.find(
          (r) =>
            r.department === ALL_DEPARTMENTS_KEY && r.position === position && r.action === action,
        )?.scope ?? null);
  return { own, inherited };
}

export type GrantRow = { revoked_at: string | null; expires_at: string | null };
export type GrantStatus = "active" | "expired" | "revoked";

export function grantStatus(g: GrantRow, now: Date = new Date()): GrantStatus {
  if (g.revoked_at) return "revoked";
  if (g.expires_at && new Date(g.expires_at).getTime() <= now.getTime()) return "expired";
  return "active";
}

/** A picked calendar day expires at the end of that day, Vietnam time. "" means no expiry. */
export function expiryFromDate(dayISO: string): string | null {
  return dayISO ? `${dayISO}T23:59:59+07:00` : null;
}

/** dd/mm/yyyy in Vietnam time. */
export function formatDay(ts: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(ts));
}

export type AuditRow = {
  kind: "matrix_set" | "matrix_unset" | "grant" | "revoke";
  department: string | null;
  position: string | null;
  action: string;
  scope_before: string | null;
  scope_after: string | null;
  expires_at: string | null;
};

/** One readable Vietnamese line for a permission_audit_logs row. */
export function auditSummary(log: AuditRow, memberName: string): string {
  const meta = PERMISSION_ACTIONS.find((a) => a.code === log.action);
  const label = meta?.label ?? log.action;
  const scoped = meta?.scoped ?? false;
  const sc = (s: string | null) => scopeLabel((s as PermissionScope | null) ?? null, scoped);
  const where = `${log.position ?? ""} · ${departmentLabel(log.department ?? "")}`;
  switch (log.kind) {
    case "matrix_set":
      return log.scope_before
        ? `${where}: “${label}” từ ${sc(log.scope_before)} thành ${sc(log.scope_after)}`
        : `${where}: thêm “${label}” (${sc(log.scope_after)})`;
    case "matrix_unset":
      return `${where}: bỏ “${label}”`;
    case "grant":
      return `Cấp riêng “${label}” (${sc(log.scope_after)}) cho ${memberName}${
        log.expires_at ? `, đến hết ${formatDay(log.expires_at)}` : ", không thời hạn"
      }`;
    case "revoke":
      return `Thu hồi quyền riêng “${label}” của ${memberName}`;
  }
}
