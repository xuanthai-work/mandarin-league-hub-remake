import {
  DEPARTMENT_IDS,
  PERMISSION_ACTIONS,
  type PermissionCode,
  type PermissionScope,
} from "./permission-catalog";
import { deptName } from "./recruitment";
import { matchesSearch } from "./search";

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
  feedback: "Nhận xét",
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
const ORDINARY_POSITIONS = ["Trưởng Ban", "Phó Ban", "Thành viên", "Cố vấn chuyên môn"] as const;
const EXECUTIVE_POSITIONS = ["Co-founder", "Thư ký"] as const;

/** Matrix columns of a department tab (mirrors the CHECK constraint of position_permissions). */
export function positionsFor(department: string): readonly string[] {
  return department === "executive" ? EXECUTIVE_POSITIONS : ORDINARY_POSITIONS;
}

function departmentLabel(department: string): string {
  return department === ALL_DEPARTMENTS_KEY ? "Tất cả các ban" : deptName(department);
}

export function scopeLabel(scope: PermissionScope | null, scoped: boolean): string {
  if (!scope) return "Không";
  if (!scoped) return "Có";
  return scope === "own" ? "Ban mình" : "Toàn tổ chức";
}

export type MatrixRow = {
  department: string;
  position: string;
  action: string;
  scope: PermissionScope;
};

/** 8 ban thường (mọi ban trừ Ban Điều hành), theo thứ tự DEPARTMENT_IDS. */
export const ORDINARY_DEPARTMENTS = DEPARTMENT_IDS.filter((d) => d !== "executive");

/** Phạm vi đang lưu của đúng ô ban × chức vụ × hành động; null là không có quyền. */
export function cellScope(
  rows: MatrixRow[],
  department: string,
  position: string,
  action: PermissionCode,
): PermissionScope | null {
  return (
    rows.find((r) => r.department === department && r.position === position && r.action === action)
      ?.scope ?? null
  );
}

/** Số hành động một chức vụ của một ban đang có (cho dòng tổng "x/47"). */
export function countGranted(rows: MatrixRow[], department: string, position: string): number {
  return rows.filter((r) => r.department === department && r.position === position).length;
}

/** Tìm hành động theo tên, mã hoặc tên nhóm, không phân biệt dấu. Từ khóa rỗng: khớp hết. */
export function actionMatches(action: ActionMeta, q: string): boolean {
  if (!q.trim()) return true;
  return matchesSearch(`${action.label} ${action.code} ${MODULE_LABELS[action.module] ?? ""}`, q);
}

export type ActionHolder = { label: string; scope: PermissionScope };

/**
 * Ai có một hành động theo ma trận (chưa tính Quản trị viên và quyền riêng), cho cách xem "Theo hành động".
 * - Một chức vụ thường có quyền ở đủ 8 ban thường với cùng phạm vi: gộp thành "<chức vụ> · mọi ban".
 * - Ngược lại: mỗi ban một mục "<chức vụ> · <tên ban>".
 * - Chức vụ Ban Điều hành: "<chức vụ> · Ban Điều hành".
 * Thứ tự: ORDINARY_POSITIONS rồi EXECUTIVE_POSITIONS; trong một chức vụ theo thứ tự DEPARTMENT_IDS.
 */
export function actionHolders(rows: MatrixRow[], action: PermissionCode): ActionHolder[] {
  const out: ActionHolder[] = [];
  for (const position of ORDINARY_POSITIONS) {
    const hits = ORDINARY_DEPARTMENTS.map((d) => ({
      d,
      s: cellScope(rows, d, position, action),
    })).filter(
      (x): x is { d: (typeof ORDINARY_DEPARTMENTS)[number]; s: PermissionScope } => x.s !== null,
    );
    const first = hits[0];
    if (
      first &&
      hits.length === ORDINARY_DEPARTMENTS.length &&
      hits.every((h) => h.s === first.s)
    ) {
      out.push({ label: `${position} · mọi ban`, scope: first.s });
    } else {
      for (const h of hits) out.push({ label: `${position} · ${deptName(h.d)}`, scope: h.s });
    }
  }
  for (const position of EXECUTIVE_POSITIONS) {
    const s = cellScope(rows, "executive", position, action);
    if (s) out.push({ label: `${position} · ${deptName("executive")}`, scope: s });
  }
  return out;
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

export type MemberPermissionRow = {
  action: string;
  scope: string;
  source: string; // "matrix" | "grant"
  grant_id: string | null;
  expires_at: string | null;
  note: string;
  granted_by_label: string;
};

export type MemberPermissionGroup = {
  module: string;
  label: string;
  items: { meta: ActionMeta; row: MemberPermissionRow }[];
};

/**
 * Rows of member_permissions() for one source, grouped by module in catalog order
 * (same order as the matrix). Unknown action codes are skipped.
 */
export function groupMemberPermissions(
  rows: MemberPermissionRow[],
  source: "matrix" | "grant",
): MemberPermissionGroup[] {
  return actionGroups()
    .map((g) => ({
      module: g.module,
      label: g.label,
      items: g.actions.flatMap((meta) =>
        rows
          .filter((r) => r.source === source && r.action === meta.code)
          .map((row) => ({ meta, row })),
      ),
    }))
    .filter((g) => g.items.length > 0);
}
