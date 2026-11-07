export type Tier = { key: string; label: string; min: number; className: string; tone: string };

/**
 * 7 contribution tiers (highest first) on the 0–450 scale.
 * Lowering the thresholds only promotes members, so nobody is demoted. The
 * exclusive "leader" tier is not part of this scale: only members an admin flags as leaders (`members.is_leader`) hold it.
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

/** Exclusive highest tier: visible only to leaders. */
export const LEADER_TIER: Tier = {
  key: "leader",
  label: "Lãnh đạo",
  min: 9999,
  className: "tier-leader",
  tone: "black",
};

export const LEADER_TONE = { key: "black", label: "Lãnh đạo" } as const;

/** Card colour: members flagged as leaders keep the obsidian card, everyone else shows their tier. */
export const getMemberCardTone = (isLeader: boolean, tierTone: string): string =>
  isLeader ? "black" : tierTone;

export const tierOf = (points: number) =>
  TIERS.find((t) => points >= t.min) ?? TIERS[TIERS.length - 1]!;

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
