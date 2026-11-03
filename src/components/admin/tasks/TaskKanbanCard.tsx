import { Check, Clock, ExternalLink, MessageCircle, RotateCcw, Trash2, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  PRIORITY_TONE,
  deptTag,
  deptTone,
  descriptionBody,
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
  onRemove,
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
  /** Documents live inside the description; keep them out of the card preview. */
  const preview = descriptionBody(group.description);

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
      className={cn(
        "cursor-pointer rounded-2xl border p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
        tone.card,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tone.tag)}
          title={group.department}
        >
          {deptTag(group.department)}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            PRIORITY_TONE[group.priority] ?? "bg-secondary text-secondary-foreground",
          )}
        >
          {priorityLabel(group.priority)}
        </span>
        <span className="ml-auto rounded-full border border-gold/50 bg-gold-soft/50 px-2 py-0.5 text-[10px] font-bold text-primary-deep">
          +{group.points}đ
        </span>
      </div>

      <h3 className="mt-2 text-sm font-semibold leading-snug text-foreground">{group.title}</h3>

      {preview && (
        <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
          {preview}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
            dueBadgeTone(group.due_on),
          )}
        >
          <Clock aria-hidden className="h-3 w-3" />
          {dueLabel(group.due_on, group.status)}
        </span>
        {group.assigned_by_name && (
          <span className="truncate text-muted-foreground">Giao: {group.assigned_by_name}</span>
        )}
      </div>

      {group.status === "revision" && revisionNote && (
        <p className="mt-2 line-clamp-2 rounded-lg bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive">
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

      <div
        className="mt-2.5 flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 items-center gap-1.5" title={names.join(", ")}>
          <div className="flex -space-x-2">
            {visible.map((assignee) => (
              <button
                key={assignee.taskId}
                type="button"
                onClick={() => onFilterPerson(assignee.id)}
                title={`${assignee.full_name} · ${assignee.member_code}`}
                className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary ring-2 ring-card transition-transform hover:-translate-y-0.5"
              >
                {initials(assignee.full_name)}
              </button>
            ))}
            {overflow > 0 && (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground ring-2 ring-card">
                +{overflow}
              </span>
            )}
          </div>
          <span className="truncate text-[11px] text-muted-foreground">
            {group.assignees.length > 1 ? (
              <span className="inline-flex items-center gap-1">
                <Users aria-hidden className="h-3 w-3" />
                {group.assignees.length} người
              </span>
            ) : (
              group.assignees[0]?.full_name
            )}
          </span>
        </div>

        {group.status !== "done" && (
          <button
            type="button"
            onClick={() => onRemove(group)}
            aria-label={`Xóa nhiệm vụ ${group.title}`}
            title="Xóa nhiệm vụ"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 aria-hidden className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}
