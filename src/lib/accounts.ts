import { RECRUIT_DEPTS, positionsFor } from "@/lib/recruitment";

export { RECRUIT_DEPTS as ACCOUNT_DEPTS, positionsFor };

export type AccessLevel = "admin" | "department_head" | "deputy_head" | "member";
export const ACCESS_LABELS: Record<AccessLevel, string> = {
  admin: "Quản trị viên",
  department_head: "Trưởng Ban (quản lý trong Ban)",
  deputy_head: "Phó Ban (quản lý công việc trong Ban)",
  member: "Thành viên",
};

export type AccountStatus = "inactive" | "active" | "suspended" | "disabled";
export const ACCOUNT_STATUS: Record<AccountStatus, string> = {
  inactive: "Chưa kích hoạt",
  active: "Đang hoạt động",
  suspended: "Tạm khóa",
  disabled: "Vô hiệu hóa",
};

export const PERMISSIONS = [
  ["members.view", "Xem thành viên"],
  ["members.edit", "Chỉnh sửa thành viên"],
  ["candidates.view", "Xem ứng viên"],
  ["candidates.process", "Xử lý ứng viên"],
  ["tasks.create", "Tạo nhiệm vụ"],
  ["tasks.assign", "Giao nhiệm vụ"],
  ["tasks.confirm", "Xác nhận nhiệm vụ"],
  ["points.view", "Xem điểm"],
  ["points.adjust", "Điều chỉnh điểm"],
  ["courses.manage", "Quản lý khóa học"],
  ["activities.manage", "Quản lý hoạt động"],
  ["news.manage", "Quản lý tin tức"],
  ["photos.manage", "Quản lý hình ảnh"],
  ["certificates.manage", "Quản lý chứng nhận"],
] as const;
export type Permission = (typeof PERMISSIONS)[number][0];

export const PERMISSION_TEMPLATES: Record<AccessLevel, Permission[]> = {
  admin: PERMISSIONS.map((p) => p[0]),
  department_head: ["members.view", "tasks.create", "tasks.assign", "tasks.confirm", "points.view"],
  deputy_head: ["members.view", "tasks.create", "tasks.assign", "tasks.confirm", "points.view"],
  member: ["points.view"],
};
