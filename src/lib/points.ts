export type Tier = { key: string; label: string; min: number; className: string; tone: string };

/**
 * 7 contribution tiers (highest first). Thresholds keep every existing member at
 * the same or a higher level than the old 4-tier scale (0/50/200/500), so nobody is demoted.
 * The 8th card colour ("black") is reserved for leaders/advisors, not earned by points.
 */
export const TIERS: Tier[] = [
  { key: "honor", label: "Danh dự", min: 2200, className: "tier-honor", tone: "honor" },
  { key: "platinum", label: "Ưu tú", min: 1600, className: "tier-purple", tone: "purple" },
  { key: "excellent", label: "Xuất sắc", min: 1000, className: "tier-pink", tone: "pink" },
  { key: "gold", label: "Nòng cốt", min: 600, className: "tier-wine", tone: "wine" },
  { key: "silver", label: "Tích cực", min: 300, className: "tier-green", tone: "green" },
  { key: "official", label: "Chính thức", min: 100, className: "tier-blue", tone: "blue" },
  { key: "bronze", label: "Tập sự", min: 0, className: "tier-bronze", tone: "bronze" },
];

export const LEADER_TONE = { key: "black", label: "Lãnh đạo / Cố vấn" } as const;

export const tierOf = (points: number) =>
  TIERS.find((t) => points >= t.min) ?? TIERS[TIERS.length - 1]!;

/** Leaders (Executive Board, heads/deputies by position, admins, advisors) keep their points but are left off the leaderboard. */
export const isLeader = (
  m: { department: string; position: string | null },
  roles: string[] = [],
  isAdvisor = false,
) =>
  isAdvisor ||
  m.department === "executive" ||
  /trưởng|phó|quản trị|cố vấn|co-founder|founder/i.test(m.position ?? "") ||
  roles.includes("admin");

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
