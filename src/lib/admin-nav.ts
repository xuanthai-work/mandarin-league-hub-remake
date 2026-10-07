import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, UserPlus, Users, ListChecks, Award, Image, Building2, GraduationCap,
  BookOpen, CalendarDays, Newspaper, Handshake, BadgeCheck, FileCheck2, FileText, Settings, Megaphone,
} from "lucide-react";

export type AdminRole = "admin" | "department_head" | "member";

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Quản trị viên",
  department_head: "Trưởng Ban",
  member: "Thành viên",
};

/** Highest role first. */
export const ROLE_PRIORITY: AdminRole[] = ["admin", "department_head", "member"];

export type AdminSection = { slug: string; label: string; icon: LucideIcon };

/** Placeholder modules rendered by /admin/$section until each is built. */
export const ADMIN_SECTIONS: AdminSection[] = [
  { slug: "recruitment", label: "Đợt tuyển & Câu hỏi", icon: Megaphone },
  { slug: "candidates", label: "Ứng viên", icon: UserPlus },
  { slug: "members", label: "Thành viên", icon: Users },
  { slug: "tasks", label: "Nhiệm vụ", icon: ListChecks },
  { slug: "contributions", label: "Điểm đóng góp", icon: Award },
  { slug: "photos", label: "Hình ảnh", icon: Image },
  { slug: "departments", label: "Ban", icon: Building2 },
  { slug: "teachers", label: "Giáo viên", icon: GraduationCap },
  { slug: "courses", label: "Khóa học", icon: BookOpen },
  { slug: "activities", label: "Hoạt động", icon: CalendarDays },
  { slug: "news", label: "Tin tức", icon: Newspaper },
  { slug: "partners", label: "Đối tác", icon: Handshake },
  { slug: "certificates", label: "Chứng nhận", icon: BadgeCheck },
  { slug: "hsk", label: "Kết quả HSK", icon: FileCheck2 },
  { slug: "content", label: "Trang & Nội dung", icon: FileText },
  { slug: "settings", label: "Cài đặt", icon: Settings },
];

export const OVERVIEW_ICON = LayoutDashboard;
