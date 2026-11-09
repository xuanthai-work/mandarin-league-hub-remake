import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  ListChecks,
  Award,
  Image,
  Building2,
  GraduationCap,
  BookOpen,
  CalendarDays,
  Newspaper,
  Handshake,
  BadgeCheck,
  FileCheck2,
  FileText,
  KeyRound,
  Settings,
  Megaphone,
  Gift,
} from "lucide-react";

/** Badge text for the signed-in user: the admin flag first, then the real position from `members`. */
export function accessLabel(isAdmin: boolean, position: string | null | undefined): string {
  if (isAdmin) return "Quản trị viên";
  return position?.trim() || "Thành viên";
}

export type AdminSection = { slug: string; label: string; icon: LucideIcon };

/** A named block of the admin sidebar; groups keep 18 modules scannable. */
export type AdminNavGroup = { title?: string; sections: AdminSection[] };

const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: "Nhân sự & Tổ chức",
    sections: [
      { slug: "recruitment", label: "Đợt tuyển & Câu hỏi", icon: Megaphone },
      { slug: "candidates", label: "Ứng viên", icon: UserPlus },
      { slug: "members", label: "Thành viên", icon: Users },
      { slug: "tasks", label: "Nhiệm vụ", icon: ListChecks },
      { slug: "contributions", label: "Điểm đóng góp", icon: Award },
      { slug: "benefits", label: "Quyền lợi thành viên", icon: Gift },
    ],
  },
  {
    title: "Học thuật & Đào tạo",
    sections: [
      { slug: "courses", label: "Khóa học", icon: BookOpen },
      { slug: "teachers", label: "Giáo viên", icon: GraduationCap },
      { slug: "hsk", label: "Kết quả HSK", icon: FileCheck2 },
      { slug: "certificates", label: "Chứng nhận", icon: BadgeCheck },
    ],
  },
  {
    title: "Hoạt động & Truyền thông",
    sections: [
      { slug: "activities", label: "Hoạt động", icon: CalendarDays },
      { slug: "news", label: "Tin tức", icon: Newspaper },
      { slug: "photos", label: "Hình ảnh", icon: Image },
      { slug: "partners", label: "Đối tác", icon: Handshake },
    ],
  },
  {
    title: "Hệ thống & Cấu hình",
    sections: [
      { slug: "departments", label: "Ban", icon: Building2 },
      { slug: "content", label: "Trang & Nội dung", icon: FileText },
      { slug: "permissions", label: "Phân quyền", icon: KeyRound },
      { slug: "settings", label: "Cài đặt", icon: Settings },
    ],
  },
];

/** Flat list used by route validation and the dashboard cards. */
export const ADMIN_SECTIONS: AdminSection[] = ADMIN_NAV_GROUPS.flatMap((g) => g.sections);

/** Groups the signed-in user may open; groups with nothing left are dropped. */
export function navGroupsFor(allowed: string[] | "all"): AdminNavGroup[] {
  if (allowed === "all") return ADMIN_NAV_GROUPS;
  return ADMIN_NAV_GROUPS.map((g) => ({
    ...(g.title ? { title: g.title } : {}),
    sections: g.sections.filter((s) => allowed.includes(s.slug)),
  })).filter((g) => g.sections.length > 0);
}

export const OVERVIEW_ICON = LayoutDashboard;
