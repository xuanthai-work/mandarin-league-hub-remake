export type Tier = { key: string; label: string; min: number; className: string; tone: string };

/**
 * 7 contribution tiers (highest first) on the 0–450 scale.
 * Lowering the thresholds only promotes members, so nobody is demoted; the
 * leader/advisor tone is separate and uses LEADER_DEFAULT_POINTS as its floor.
 */
export const TIERS: Tier[] = [
  { key: "honor", label: "Danh dự", min: 401, className: "tier-honor", tone: "honor" },
  { key: "platinum", label: "Ưu tú", min: 351, className: "tier-purple", tone: "purple" },
  { key: "excellent", label: "Xuất sắc", min: 201, className: "tier-pink", tone: "pink" },
  { key: "gold", label: "Nòng cốt", min: 151, className: "tier-wine", tone: "wine" },
  { key: "silver", label: "Tích cực", min: 101, className: "tier-green", tone: "green" },
  { key: "official", label: "Chính thức", min: 51, className: "tier-blue", tone: "blue" },
  { key: "bronze", label: "Tập sự", min: 0, className: "tier-bronze", tone: "bronze" },
];

/** Co-founders and current professional advisors start at 400 points (Ưu tú floor). */
export const LEADER_DEFAULT_POINTS = 400;

export const LEADER_TONE = { key: "black", label: "Lãnh đạo / Cố vấn" } as const;

export const tierOf = (points: number) =>
  TIERS.find((t) => points >= t.min) ?? TIERS[TIERS.length - 1]!;

const LEADER_ROLES = ["admin", "department_head", "deputy_head"];
/** Leaders (Executive Board, heads, deputies, admins, professional advisors) keep their points but are left off the leaderboard. */
export const isLeader = (
  m: { department: string; position: string | null },
  roles: string[] = [],
  isAdvisor = false,
) =>
  isAdvisor ||
  m.department === "executive" ||
  /trưởng|phó|quản trị|cố vấn|co-founder|founder/i.test(m.position ?? "") ||
  roles.some((r) => LEADER_ROLES.includes(r));

export const TASK_STATUS: Record<string, { label: string; className: string }> = {
  assigned: { label: "Chờ tiếp nhận", className: "bg-secondary text-foreground" },
  in_progress: { label: "Đang thực hiện", className: "bg-primary/10 text-primary" },
  submitted: { label: "Đã nộp báo cáo", className: "bg-warning-soft text-warning-foreground" },
  revision: { label: "Cần làm lại", className: "bg-destructive/10 text-destructive" },
  done: { label: "Hoàn thành", className: "bg-success/15 text-success" },
};

export const PRIORITY: Record<string, string> = { low: "Thấp", medium: "Vừa", high: "Cao" };

export const POINT_KIND: Record<string, string> = {
  task: "Nhiệm vụ",
  attendance: "Điểm danh",
  bonus: "Thưởng",
  penalty: "Trừ điểm",
};

export const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");
