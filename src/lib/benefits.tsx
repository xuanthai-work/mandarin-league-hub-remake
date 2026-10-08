import { BookOpenText, Clapperboard, Film, Gift, GraduationCap, Headphones, Languages, Palette, type LucideIcon } from "lucide-react";

/** Branded tile style per benefit icon key (no third-party logos bundled). */
export const BENEFIT_ICONS: Record<string, { icon: LucideIcon; label: string; tile: string }> = {
  hanzii: { icon: Languages, label: "Hanzii", tile: "bg-gradient-to-br from-destructive to-gold" },
  migii: { icon: GraduationCap, label: "Migii", tile: "bg-gradient-to-br from-primary to-primary-deep" },
  heychina: { icon: Headphones, label: "HeyChina", tile: "bg-gradient-to-br from-gold to-destructive" },
  canva: { icon: Palette, label: "Canva", tile: "bg-gradient-to-br from-primary to-gold" },
  capcut: { icon: Clapperboard, label: "CapCut", tile: "bg-gradient-to-br from-primary-deep to-foreground" },
  netflix: { icon: Film, label: "Netflix", tile: "bg-gradient-to-br from-destructive to-primary-deep" },
  book: { icon: BookOpenText, label: "Sách / Tài liệu", tile: "bg-gradient-to-br from-primary to-success" },
  gift: { icon: Gift, label: "Khác", tile: "bg-gradient-to-br from-gold to-primary" },
};

export const BENEFIT_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Đang hoạt động", className: "bg-success/15 text-success" },
  pending: { label: "Chờ cấp", className: "bg-warning-soft text-warning-foreground" },
  paused: { label: "Tạm ngưng", className: "bg-secondary text-foreground" },
  revoked: { label: "Đã thu hồi", className: "bg-destructive/10 text-destructive" },
  expired: { label: "Đã hết hạn", className: "bg-destructive/10 text-destructive" },
  locked: { label: "Chưa đạt điều kiện", className: "bg-secondary text-muted-foreground" },
};

export function BenefitIcon({ iconKey, size = "md" }: { iconKey: string; size?: "sm" | "md" }) {
  const b = BENEFIT_ICONS[iconKey] ?? BENEFIT_ICONS.gift!;
  const I = b.icon;
  const box = size === "sm" ? "h-9 w-9 rounded-lg" : "h-14 w-14 rounded-2xl";
  return (
    <span className={`${box} ${b.tile} relative inline-flex shrink-0 items-center justify-center text-primary-foreground shadow-md ring-1 ring-gold/40`}>
      <span aria-hidden className="absolute inset-0 rounded-[inherit] bg-gradient-to-t from-transparent to-background/25" />
      <I className={size === "sm" ? "relative h-4 w-4" : "relative h-7 w-7"} strokeWidth={1.8} />
    </span>
  );
}

export const daysLeft = (d: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null);
