export type Tier = { key: string; label: string; min: number; className: string; tone: string };

/**
 * 7 contribution tiers (highest first) on the 0–450 scale.
 * Lowering the thresholds only promotes members, so nobody is demoted. The
 * exclusive "leader" tier is not part of this scale: only founders/co-founders
 * see and hold it.
 */
export const TIERS: Tier[] = [
  { key: "honor", label: "Danh dự", min: 401, className: "tier-wine", tone: "wine" },
  { key: "platinum", label: "Ưu tú", min: 351, className: "tier-carnelian", tone: "carnelian" },
  { key: "excellent", label: "Xuất sắc", min: 201, className: "tier-pink", tone: "pink" },
  { key: "gold", label: "Nòng cốt", min: 151, className: "tier-purple", tone: "purple" },
  { key: "silver", label: "Tích cực", min: 101, className: "tier-blue", tone: "blue" },
  { key: "official", label: "Chính thức", min: 51, className: "tier-green", tone: "green" },
  { key: "bronze", label: "Tập sự", min: 0, className: "tier-bronze", tone: "bronze" },
];

/** Founders and co-founders start at 400 points (Ưu tú floor). */
export const LEADER_DEFAULT_POINTS = 400;

/** Founder / co-founder detection by position title. */
export const isFounder = (position: string | null | undefined): boolean =>
  /co-founder|founder/i.test(position ?? "");

/** Exclusive highest tier: visible only to founders/co-founders. */
export const LEADER_TIER: Tier = {
  key: "leader",
  label: "Lãnh đạo",
  min: 9999,
  className: "tier-leader",
  tone: "black",
};

export const LEADER_TONE = { key: "black", label: "Nhà sáng lập" } as const;

/**
 * Card colour: only founders/co-founders keep the obsidian leader card. Every other
 * position (department heads, deputies, advisors included) follows the member's own
 * contribution tier tone.
 */
export const getMemberCardTone = (
  m: { department?: string; position: string | null },
  roles: string[] = [],
  isAdvisor = false,
  defaultTierTone = "blue",
): string => {
  const pos = m.position ?? "";
  if (isFounder(pos)) return "black";
  return defaultTierTone;
};

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
