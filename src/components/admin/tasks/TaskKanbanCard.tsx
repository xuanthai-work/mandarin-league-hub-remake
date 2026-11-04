import { Check, Clock, ExternalLink, MessageCircle, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  PRIORITY_TONE,
  deptTag,
  deptTone,
  dueBadgeTone,
  dueLabel,
  initials,
  priorityLabel,
  submittedTasks,
  type GroupedTask,
} from "./shared";

interface TaskKanbanCardProps {
  group: GroupedTask;
  /** True inside the "Chờ duyệt báo cáo" column: evidence + fast review actions. */
  inReview: boolean;
  onOpen: () => void;
  onApprove: (group: GroupedTask) => void;
  onRequestRevision: (group: GroupedTask) => void;
  /** Deletion now lives in TaskDetailModal; kept so the board can keep passing it. */
  onRemove: (group: GroupedTask) => void;
  onFilterPerson: (memberId: string) => void;
}

const MAX_AVATARS = 3;

export function TaskKanbanCard({
  group,
  inReview,
  onOpen,
  onApprove,
  onRequestRevision,
  onFilterPerson,
}: TaskKanbanCardProps) {
  const tone = deptTone(group.department);
  const pending = submittedTasks(group);
  const pendingPoints = pending.reduce((sum, task) => sum + (task.points || 0), 0);
  const evidence = pending.find((task) => task.evidence_url);
  const isZalo = evidence?.evidence_url.startsWith("zalo:") ?? false;
  const zaloTarget = isZalo ? evidence!.evidence_url.slice(5).split(" | ")[0] : "";
  const revisionNote = group.rawTasks.find((task) => task.review_note)?.review_note ?? "";

  const names = group.assignees.map((a) => a.full_name);
  const visible = group.assignees.slice(0, MAX_AVATARS);
  const overflow = group.assignees.length - visible.length;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Xem chi tiết nhiệm vụ ${group.title}`}
      className="cursor-pointer rounded-xl border border-border/80 bg-card p-3 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
    >
      {/* Top row: dept tag + priority */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium", tone.tag)}
          title={group.department}
        >
          {deptTag(group.department)}
        </span>
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
            PRIORITY_TONE[group.priority] ?? "bg-secondary text-secondary-foreground",
          )}
        >
          {priorityLabel(group.priority)}
        </span>
      </div>

      <h3 className="mt-2 text-[13px] font-semibold leading-snug text-foreground">
        {group.title}
      </h3>

      {group.status === "revision" && revisionNote && (
        <p className="mt-2 line-clamp-2 rounded-lg bg-destructive/5 px-2 py-1 text-[10px] text-destructive">
          Làm lại: {revisionNote}
        </p>
      )}

      {inReview && (
        <div
          className="mt-2.5 space-y-2 rounded-xl border border-amber-300/50 bg-amber-500/5 p-2.5 dark:border-amber-400/25"
          onClick={(e) => e.stopPropagation()}
        >
          {evidence ? (
            isZalo ? (
              <p className="flex items-center gap-1.5 text-[11px] text-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  <MessageCircle aria-hidden className="h-3 w-3" />
                  Zalo
                </span>
                Đã gửi tới <b className="font-semibold">{zaloTarget || "Zalo"}</b>
              </p>
            ) : (
              <a
                href={evidence.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary underline"
              >
                <ExternalLink aria-hidden className="h-3 w-3" />
                Mở link minh chứng
              </a>
            )
          ) : (
            <p className="text-[11px] text-muted-foreground">Chưa đính kèm minh chứng.</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onApprove(group)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Check aria-hidden className="h-3.5 w-3.5" />
              Duyệt (+{pendingPoints}đ)
            </button>
            <button
              type="button"
              onClick={() => onRequestRevision(group)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              <RotateCcw aria-hidden className="h-3.5 w-3.5" />
              Làm lại
            </button>
          </div>
        </div>
      )}

      {/* Footer: due date (left) | points + assignees (right) */}
      <div
        className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px]",
            dueBadgeTone(group.due_on),
          )}
        >
          <Clock aria-hidden className="h-3 w-3" />
          {dueLabel(group.due_on, group.status)}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="shrink-0 rounded-md border border-gold/40 bg-gold-soft/40 px-1.5 py-0.5 text-[10px] font-bold text-primary-deep">
            +{group.points}đ
          </span>
          <div className="flex -space-x-1.5" title={names.join(", ")}>
            {visible.map((assignee) => (
              <button
                key={assignee.taskId}
                type="button"
                onClick={() => onFilterPerson(assignee.id)}
                title={`${assignee.full_name} · ${assignee.member_code}`}
                className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary ring-2 ring-card transition-transform hover:-translate-y-0.5"
              >
                {initials(assignee.full_name)}
              </button>
            ))}
            {overflow > 0 && (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-[9px] font-bold text-muted-foreground ring-2 ring-card">
                +{overflow}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
