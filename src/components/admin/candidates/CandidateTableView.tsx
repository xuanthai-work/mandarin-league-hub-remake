import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ChevronRight, FileText, Search } from "lucide-react";

import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { Button } from "@/components/ui/button";
import { deptName, type Choice } from "@/lib/recruitment";
import {
  APP_STATUS_TONE,
  choicesOf,
  formatDateTime,
  initials,
  statusLabel,
  type CandidateProfile,
} from "./shared";

interface CandidateTableViewProps {
  apps: CandidateProfile[];
  onOpen: (app: CandidateProfile) => void;
  onOpenCv: (path: string) => void;
}

const COLUMNS: AdminColumn[] = [
  { key: "candidate", label: "Ứng viên", className: "w-[230px]" },
  { key: "choices", label: "Nguyện vọng" },
  { key: "skills", label: "Năng lực", className: "w-[200px]" },
  { key: "status", label: "Trạng thái", className: "w-[170px]" },
  { key: "date", label: "Ngày nộp", className: "w-[130px]" },
  { key: "actions", label: "Thao tác", srOnly: true, className: "w-20 text-right" },
];

function AspirationList({ choices }: { choices: Choice[] }) {
  if (choices.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="space-y-1">
      {choices.map((c, i) => (
        <div key={`${c.position_id}-${i}`} className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            NV{i + 1}
          </span>
          <span
            className="min-w-0 truncate text-xs text-foreground"
            title={`${deptName(c.department)} · ${c.position}`}
          >
            {deptName(c.department)} · {c.position}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CandidateTableView({ apps, onOpen, onOpenCv }: CandidateTableViewProps) {
  const [tableBodyRef] = useAutoAnimate<HTMLTableSectionElement>();

  if (apps.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="Không tìm thấy hồ sơ phù hợp"
        description="Thử xóa bộ lọc hoặc tìm bằng tên, email, số điện thoại, mã hồ sơ."
      />
    );
  }

  return (
    <AdminTable columns={COLUMNS} minWidth="min-w-[1000px]" bodyRef={tableBodyRef}>
      {apps.map((app) => (
        <AdminTableRow key={app.id} onOpen={() => onOpen(app)}>
          <td className="px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {initials(app.full_name)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{app.full_name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{app.code}</p>
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <AspirationList choices={choicesOf(app)} />
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[11px] font-medium text-foreground">
                {app.chinese_level || "Chưa rõ trình độ"}
              </span>
              {app.hsk_level ? (
                <span className="rounded-full border border-gold/60 bg-gold-soft/40 px-2 py-0.5 text-[11px] font-semibold text-primary-deep">
                  {app.hsk_level}
                </span>
              ) : (
                <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  Chưa có HSK
                </span>
              )}
            </div>
          </td>
          <td className="px-4 py-3">
            <StatusPill tone={APP_STATUS_TONE[app.status] ?? "neutral"}>
              {statusLabel(app.status)}
            </StatusPill>
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
            {formatDateTime(app.created_at)}
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center justify-end gap-1">
              {app.cv_path && (
                <Button
                  type="button"
                  variant="outline"
                  size="admin-icon"
                  title="Xem nhanh CV"
                  aria-label={`Xem CV của ${app.full_name}`}
                  onClick={() => onOpenCv(app.cv_path ?? "")}
                  className="text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  <FileText aria-hidden />
                </Button>
              )}
              <ChevronRight aria-hidden className="h-4 w-4 text-muted-foreground" />
            </div>
          </td>
        </AdminTableRow>
      ))}
    </AdminTable>
  );
}
