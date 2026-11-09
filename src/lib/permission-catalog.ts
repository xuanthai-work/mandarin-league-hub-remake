import { z } from "zod";

export const DEPARTMENT_IDS = [
  "executive",
  "hr",
  "academic",
  "comms",
  "design",
  "translation",
  "postcard",
  "finance",
  "tech",
] as const;

export const POSITIONS = [
  { name: "Co-founder", rank: 4, executive: true },
  { name: "Thư ký", rank: 1, executive: true },
  { name: "Trưởng Ban", rank: 3, executive: false },
  { name: "Phó Ban", rank: 2, executive: false },
  { name: "Cố vấn chuyên môn", rank: 1, executive: false },
  { name: "Thành viên", rank: 1, executive: false },
] as const;
export type PositionName = (typeof POSITIONS)[number]["name"];

export type PermissionScope = "own" | "all";

export const PERMISSION_ACTIONS = [
  {
    code: "recruitment.view",
    module: "recruitment",
    label: "Xem đợt tuyển và ngân hàng câu hỏi",
    scoped: false,
  },
  {
    code: "recruitment.create",
    module: "recruitment",
    label: "Tạo đợt tuyển",
    scoped: false,
  },
  {
    code: "recruitment.edit",
    module: "recruitment",
    label: "Sửa đợt tuyển và vị trí tuyển (mở, đóng, xóa)",
    scoped: false,
  },
  {
    code: "questions.edit",
    module: "recruitment",
    label: "Thêm, sửa, xóa chủ đề và câu hỏi tuyển dụng",
    scoped: false,
  },
  {
    code: "candidates.view",
    module: "recruitment",
    label: "Xem hồ sơ, câu trả lời, CV và tệp đính kèm của ứng viên",
    scoped: true,
  },
  {
    code: "candidates.edit",
    module: "recruitment",
    label: "Xem đầy đủ và xử lý ứng viên (AI, trạng thái, ghi chú, lịch sử)",
    scoped: false,
  },
  {
    code: "candidates.convert",
    module: "recruitment",
    label: "Kết nạp ứng viên thành thành viên và tạo tài khoản",
    scoped: true,
  },
  {
    code: "members.view",
    module: "members",
    label: "Xem danh sách, hồ sơ (gồm SĐT, email) và xuất CSV thành viên mọi Ban",
    scoped: true,
  },
  {
    code: "members.edit",
    module: "members",
    label:
      "Thêm, sửa, đổi Ban/chức vụ, ẩn/hiện, xóa thành viên và quản lý tài khoản đăng nhập (người chức thấp hơn)",
    scoped: true,
  },
  {
    code: "onboarding.manage",
    module: "members",
    label: "Tạo và xem lộ trình hội nhập AI",
    scoped: true,
  },
  { code: "tasks.view", module: "tasks", label: "Xem nhiệm vụ của cả Ban", scoped: true },
  { code: "tasks.create", module: "tasks", label: "Giao nhiệm vụ", scoped: true },
  {
    code: "tasks.edit",
    module: "tasks",
    label: "Sửa, duyệt / yêu cầu làm lại và xóa nhiệm vụ do mình giao",
    scoped: true,
  },
  {
    code: "points.view",
    module: "points",
    label: "Xem lịch sử điểm của cả Ban",
    scoped: true,
  },
  {
    code: "points.attendance",
    module: "points",
    label: "Điểm danh từ Google Meet (Họp làm việc 2 điểm, Họp toàn thể 10 điểm)",
    scoped: true,
  },
  {
    code: "points.adjust",
    module: "points",
    label: "Thưởng hoặc trừ 5, 10 hoặc 20 điểm kèm minh chứng (người chức thấp hơn)",
    scoped: true,
  },
  {
    code: "benefits.manage",
    module: "benefits",
    label: "Quản lý quyền lợi thành viên (tài khoản dùng chung, logo)",
    scoped: false,
  },
  {
    code: "departments.view",
    module: "departments",
    label: "Xem các Ban: lãnh đạo, kênh làm việc và cố vấn",
    scoped: false,
  },
  {
    code: "departments.edit",
    module: "departments",
    label: "Sửa kênh làm việc và cố vấn của Ban",
    scoped: true,
  },
  {
    code: "courses.view",
    module: "courses",
    label:
      "Xem lớp HSK, chương trình, phân công giáo viên, link nhóm và đơn đăng ký học (gồm xuất CSV)",
    scoped: false,
  },
  {
    code: "courses.edit",
    module: "courses",
    label: "Quản lý lớp HSK, chương trình, phân công giáo viên, link nhóm và duyệt đơn đăng ký học",
    scoped: false,
  },
  { code: "teachers.view", module: "academic", label: "Xem hồ sơ giáo viên", scoped: false },
  {
    code: "teachers.edit",
    module: "academic",
    label: "Thêm, sửa, xóa hồ sơ và ảnh giáo viên",
    scoped: false,
  },
  {
    code: "hsk.view",
    module: "academic",
    label: "Xem kết quả HSK và lịch sử sửa điểm",
    scoped: false,
  },
  {
    code: "hsk.edit",
    module: "academic",
    label: "Nhập, sửa, thu hồi kết quả HSK và xóa kết quả đã thu hồi",
    scoped: false,
  },
  {
    code: "certificates.view",
    module: "academic",
    label: "Xem chứng nhận và tệp chứng nhận",
    scoped: false,
  },
  {
    code: "certificates.edit",
    module: "academic",
    label: "Thêm, sửa, xóa chứng nhận, tệp chứng nhận và dùng AI đọc chứng nhận",
    scoped: false,
  },
  {
    code: "activities.view",
    module: "activities",
    label: "Xem hoạt động (kể cả nháp), người đăng ký và nhật ký hoạt động",
    scoped: false,
  },
  {
    code: "activities.edit",
    module: "activities",
    label: "Tạo, sửa, đăng, hủy, xóa hoạt động và cập nhật người đăng ký",
    scoped: false,
  },
  {
    code: "news.view",
    module: "news",
    label: "Xem mọi bài viết tin tức (kể cả nháp, chờ duyệt)",
    scoped: false,
  },
  {
    code: "news.edit",
    module: "news",
    label: "Viết, sửa bài của mình; duyệt, đăng, gỡ bài của người chức thấp hơn",
    scoped: false,
  },
  {
    code: "photos.view",
    module: "photos",
    label: "Xem thư viện ảnh hoạt động (kể cả ảnh ẩn)",
    scoped: false,
  },
  {
    code: "photos.edit",
    module: "photos",
    label: "Tải, sửa, ẩn/hiện, sắp xếp và xóa ảnh hoạt động",
    scoped: false,
  },
  { code: "partners.view", module: "partners", label: "Xem đối tác", scoped: false },
  {
    code: "partners.edit",
    module: "partners",
    label: "Thêm, sửa, ẩn, xóa đối tác và logo",
    scoped: false,
  },
  { code: "content.edit", module: "content", label: "Sửa nháp Trang và Nội dung", scoped: false },
  {
    code: "content.publish",
    module: "content",
    label: "Xuất bản Trang và Nội dung",
    scoped: false,
  },
  { code: "trash.purge", module: "trash", label: "Xóa vĩnh viễn trong Thùng rác", scoped: false },
] as const;
export type PermissionCode = (typeof PERMISSION_ACTIONS)[number]["code"];

export type MyPermissions = {
  isAdmin: boolean;
  actions: Partial<Record<PermissionCode, PermissionScope>>;
};

export const NO_PERMISSIONS: MyPermissions = { isAdmin: false, actions: {} };

const CODES = new Set<string>(PERMISSION_ACTIONS.map((a) => a.code));

/** Read the my_permissions() RPC result; unknown codes are dropped, garbage means no permissions. */
export function parseMyPermissions(raw: unknown): MyPermissions {
  const parsed = z
    .object({ is_admin: z.boolean(), actions: z.record(z.string(), z.enum(["own", "all"])) })
    .safeParse(raw);
  if (!parsed.success) return NO_PERMISSIONS;
  const actions: MyPermissions["actions"] = {};
  for (const [code, scope] of Object.entries(parsed.data.actions)) {
    if (CODES.has(code)) actions[code as PermissionCode] = scope;
  }
  return { isAdmin: parsed.data.is_admin, actions };
}

/** Client mirror of has_perm(): only hides/shows UI; the database still decides. */
export function can(
  p: MyPermissions,
  code: PermissionCode,
  rowDept?: string | null,
  myDept?: string | null,
): boolean {
  if (p.isAdmin) return true;
  const scope = p.actions[code];
  if (!scope) return false;
  const scoped = PERMISSION_ACTIONS.find((a) => a.code === code)?.scoped ?? false;
  if (scope === "all" || !scoped) return true;
  // "own" for a department-scoped action: unknown row department (e.g. menu) counts as allowed.
  if (rowDept === undefined) return true;
  return !!rowDept && rowDept === myDept;
}

export function positionRank(position: string): number {
  return POSITIONS.find((p) => p.name === position)?.rank ?? 1;
}

/** Whether the holder of `actor` ranks strictly higher than the holder of `target`. */
export function outranksPosition(actor: string, target: string): boolean {
  return positionRank(actor) > positionRank(target);
}
