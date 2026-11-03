import { ChevronRight, FileText, Search } from "lucide-react";

import { deptName, type Choice } from "@/lib/recruitment";
import { cn } from "@/lib/utils";
import {
  STATUS_DOT,
  STATUS_TONE,
  choicesOf,
  formatDateTime,
  initials,
  statusLabel,
  type CandidateApp,
} from "./shared";

interface CandidateTableViewProps {
  apps: CandidateApp[];
  onOpen: (app: CandidateApp) => void;
  onOpenCv: (path: string) => void;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        STATUS_TONE[status] ?? "bg-secondary text-secondary-foreground",
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status] ?? "bg-muted-foreground/50")}
      />
      {statusLabel(status)}
    </span>
  );
}

function AspirationList({ choices }: { choices: Choice[] }) {
  if (choices.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="space-y-1">
      {choices.map((c, i) => (
        <div key={`${c.position_id}-${i}`} className="flex items-center gap-1.5">
          <span className="rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            NV{i + 1}
          </span>
          <span className="whitespace-nowrap text-xs text-foreground">
            {deptName(c.department)} · {c.position}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CandidateTableView({ apps, onOpen, onOpenCv }: CandidateTableViewProps) {
  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-12 text-center">
        <Search aria-hidden className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Không tìm thấy hồ sơ phù hợp</p>
        <p className="text-xs text-muted-foreground">
          Thử xóa bộ lọc hoặc tìm bằng tên, email, số điện thoại, mã hồ sơ.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-secondary/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Ứng viên</th>
              <th className="px-4 py-3 font-semibold">Nguyện vọng</th>
              <th className="px-4 py-3 font-semibold">Năng lực</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold">Ngày nộp</th>
              <th className="w-24 px-4 py-3 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => (
              <tr
                key={app.id}
                tabIndex={0}
                onClick={() => onOpen(app)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(app);
                  }
                }}
                className="cursor-pointer border-t border-border/70 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {initials(app.full_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{app.full_name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{app.code}</p>
                    </div>
                  </div>
                </td>
                <td className="max-w-[260px] px-4 py-3">
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
                  <StatusBadge status={app.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                  {formatDateTime(app.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {app.cv_path && (
                      <button
                        type="button"
                        title="Xem nhanh CV"
                        aria-label={`Xem CV của ${app.full_name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCv(app.cv_path ?? "");
                        }}
                        className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronRight aria-hidden className="h-4 w-4 text-muted-foreground" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
