import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  FolderOpen,
  GraduationCap,
  MessageCircle,
  Settings2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeptMember, DeptSummary } from "@/lib/department-summary";

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

function LeaderRow({ member, role }: { member: DeptMember; role: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">
        {initial(member.full_name)}
      </span>
      <span className="truncate text-sm font-medium text-foreground">{member.full_name}</span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{role}</span>
    </div>
  );
}

function StatusCell({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof MessageCircle;
  label: string;
  value: string;
  tone?: string | undefined;
}) {
  return (
    <div>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-xs font-medium ${tone ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

export function DepartmentCard({
  summary,
  onConfigure,
}: {
  summary: DeptSummary;
  onConfigure: () => void;
}) {
  const hasZalo = !!summary.channel?.zalo_url.trim();
  const hasDocs = !!summary.channel?.resources_url.trim();
  const advisorEmpty = summary.warnings.includes("advisor_empty");
  const extraDeputies = summary.deputies.length - 2;

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground">{summary.name}</h3>
          <p className="text-xs text-muted-foreground">{summary.nameEn}</p>
        </div>
        <span
          title={`${summary.activeCount} đang hoạt động · ${summary.onLeaveCount} tạm nghỉ`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
        >
          <Users className="h-3.5 w-3.5" />
          {summary.activeCount}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {summary.head ? (
          <LeaderRow member={summary.head} role="Trưởng Ban" />
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-warning-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Chưa có Trưởng Ban
          </p>
        )}
        {summary.deputies.slice(0, 2).map((m) => (
          <LeaderRow key={m.id} member={m} role="Phó Ban" />
        ))}
        {extraDeputies > 0 && (
          <p className="pl-9 text-xs text-muted-foreground">+{extraDeputies} Phó Ban</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/70 pt-3">
        <StatusCell
          icon={MessageCircle}
          label="Zalo"
          value={hasZalo ? "Đã có" : "Chưa có"}
          tone={hasZalo ? "text-success" : "text-muted-foreground"}
        />
        <StatusCell
          icon={FolderOpen}
          label="Tài liệu"
          value={hasDocs ? "Đã có" : "Chưa có"}
          tone={hasDocs ? "text-success" : "text-muted-foreground"}
        />
        <StatusCell
          icon={GraduationCap}
          label="Cố vấn"
          value={summary.advisorsEnabled ? `${summary.advisorCount} người` : "Tắt"}
          tone={advisorEmpty ? "text-warning-foreground" : undefined}
        />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <Link
          to="/admin/members"
          search={{ dept: summary.id }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Xem thành viên <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Button type="button" variant="outline" size="sm" onClick={onConfigure}>
          <Settings2 className="h-3.5 w-3.5" />
          Cấu hình
        </Button>
      </div>
    </article>
  );
}
