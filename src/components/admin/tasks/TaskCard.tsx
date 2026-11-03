import type { MouseEvent } from "react";
import { Check, RotateCcw, Trash2 } from "lucide-react";

import { TaskEvidence } from "@/components/portal/TaskEvidence";
import { TASK_STATUS } from "@/lib/points";
import { deptName } from "@/lib/recruitment";
import { cn } from "@/lib/utils";
import {
  PRIORITY_TONE,
  STATUS_DOT,
  STATUS_TONE,
  dueLabel,
  dueTone,
  initials,
  priorityLabel,
  type Task,
  type TaskMember,
} from "./shared";

interface TaskCardProps {
  task: Task;
  member: TaskMember | null;
  onApprove: (task: Task) => void;
  onRequestRevision: (task: Task) => void;
  onRemove: (task: Task) => void;
  onFilterPerson: (memberId: string) => void;
  onFilterGiver: (giver: string) => void;
}

export function TaskCard({
  task,
  member,
  onApprove,
  onRequestRevision,
  onRemove,
  onFilterPerson,
  onFilterGiver,
}: TaskCardProps) {
  const statusLabel = TASK_STATUS[task.status]?.label ?? task.status;
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <article className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 text-sm font-semibold text-foreground">{task.title}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              PRIORITY_TONE[task.priority] ?? "bg-secondary text-secondary-foreground",
            )}
          >
            Ưu tiên {priorityLabel(task.priority)}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              STATUS_TONE[task.status] ?? "bg-secondary text-secondary-foreground",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                STATUS_DOT[task.status] ?? "bg-muted-foreground/50",
              )}
            />
            {statusLabel}
          </span>
          <span className="rounded-full border border-gold/50 bg-gold-soft/40 px-2 py-0.5 text-[10px] font-bold text-primary-deep">
            +{task.points} điểm
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {initials(member?.full_name ?? "—")}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFilterPerson(task.assignee_id);
            }}
            title="Xem các nhiệm vụ của người này"
            className="font-semibold text-foreground transition-colors hover:text-primary hover:underline"
          >
            {member?.full_name ?? "Chưa rõ"}
          </button>
          {member?.member_code && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {member.member_code}
            </span>
          )}
        </span>
        <span className="text-border">|</span>
        <span>{deptName(task.department)}</span>
        <span className="text-border">|</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium",
            dueTone(task.due_on, task.status),
          )}
        >
          {dueLabel(task.due_on, task.status)}
        </span>
        <span className="text-border">|</span>
        <span className="inline-flex items-center gap-1">
          Giao bởi:
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (task.assigned_by_name) onFilterGiver(task.assigned_by_name);
            }}
            className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
          >
            {task.assigned_by_name || "—"}
          </button>
          {task.assigned_by_note && <span className="text-[11px]">— {task.assigned_by_note}</span>}
        </span>
      </div>

      {task.description && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
          {task.description}
        </p>
      )}

      {task.evidence_url && (
        <div onClick={stop}>
          <TaskEvidence value={task.evidence_url} note={task.report_note} />
        </div>
      )}

      {task.review_note && (
        <p className="mt-2 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Yêu cầu làm lại: {task.review_note}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2" onClick={stop}>
        {task.status === "submitted" && (
          <>
            <button
              type="button"
              onClick={() => onApprove(task)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Check className="h-3.5 w-3.5" />
              Duyệt hoàn thành (+{task.points} điểm)
            </button>
            <button
              type="button"
              onClick={() => onRequestRevision(task)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Yêu cầu làm lại
            </button>
          </>
        )}
        {task.status !== "done" && (
          <button
            type="button"
            onClick={() => onRemove(task)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa
          </button>
        )}
      </div>
    </article>
  );
}
