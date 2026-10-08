export type Tier = { key: string; label: string; min: number; className: string };

/** Contribution tiers shown on the member card. */
export const TIERS: Tier[] = [
  { key: "platinum", label: "Tinh hoa", min: 500, className: "tier-purple" },
  { key: "gold", label: "Nòng cốt", min: 200, className: "bg-gold text-foreground border-gold" },
  { key: "silver", label: "Tích cực", min: 50, className: "bg-secondary text-foreground border-border" },
  { key: "bronze", label: "Tập sự", min: 0, className: "bg-gold-soft text-foreground border-gold" },
];

export const tierOf = (points: number) => TIERS.find((t) => points >= t.min) ?? TIERS[TIERS.length - 1]!;

export const TASK_STATUS: Record<string, { label: string; className: string }> = {
  assigned: { label: "Chờ tiếp nhận", className: "bg-secondary text-foreground" },
  in_progress: { label: "Đang thực hiện", className: "bg-primary/10 text-primary" },
  submitted: { label: "Đã nộp báo cáo", className: "bg-warning-soft text-warning-foreground" },
  revision: { label: "Cần làm lại", className: "bg-destructive/10 text-destructive" },
  done: { label: "Hoàn thành", className: "bg-success/15 text-success" },
};

export const PRIORITY: Record<string, string> = { low: "Thấp", medium: "Vừa", high: "Cao" };

export const POINT_KIND: Record<string, string> = {
  task: "Nhiệm vụ", attendance: "Điểm danh", bonus: "Thưởng", penalty: "Trừ điểm",
};

export const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");
