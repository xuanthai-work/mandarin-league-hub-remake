import type { ReactNode } from "react";
import { UserRound } from "lucide-react";
import { useTr } from "@/lib/i18n";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-sm font-semibold uppercase tracking-widest text-primary">{children}</div>
  );
}

export function SectionTitle({
  label,
  title,
  desc,
}: {
  label: string;
  title: string;
  desc?: string;
}) {
  const tr = useTr();
  return (
    <div>
      <SectionLabel>{tr(label)}</SectionLabel>
      <h2 className="mt-3 text-2xl font-bold text-primary-deep md:text-4xl">{tr(title)}</h2>
      {desc && <p className="mt-3 max-w-2xl text-muted-foreground">{tr(desc)}</p>}
    </div>
  );
}

export function DemoBadge() {
  return (
    <span className="rounded-md bg-gold-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning-foreground">
      Demo
    </span>
  );
}

const STATUS_STYLE: Record<string, string> = {
  "Đang tuyển sinh": "bg-success/15 text-success",
  "Đang mở đăng ký": "bg-success/15 text-success",
  "Sắp khai giảng": "bg-accent text-accent-foreground",
  "Sắp diễn ra": "bg-accent text-accent-foreground",
  "Đã đủ lớp": "bg-gold-soft text-warning-foreground",
  "Đã kết thúc": "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  const tr = useTr();
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {tr(status)}
    </span>
  );
}

export function EmptyState({ title = "Đang cập nhật", desc }: { title?: string; desc?: string }) {
  const tr = useTr();
  return (
    <div className="rounded-2xl border border-dashed border-primary/40 bg-accent/40 p-10 text-center">
      <p className="font-semibold text-primary-deep">
        {tr(title)}
        {desc ? ` — ${tr(desc)}` : ""}
      </p>
    </div>
  );
}

export function PersonSlot({ role, name }: { role: string; name?: string | undefined }) {
  const tr = useTr();
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
        <UserRound className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{tr(role)}</div>
        <div className="text-sm font-medium">{name ?? tr("Đang cập nhật")}</div>
      </div>
    </div>
  );
}

export function Chips<T extends string>({
  items,
  value,
  onChange,
  allLabel = "Tất cả",
}: {
  items: T[];
  value: T | "all";
  onChange: (v: T | "all") => void;
  allLabel?: string;
}) {
  const tr = useTr();
  const all: (T | "all")[] = ["all", ...items];
  return (
    <div className="flex flex-wrap gap-2">
      {all.map((i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${value === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}
        >
          {tr(i === "all" ? allLabel : i)}
        </button>
      ))}
    </div>
  );
}
