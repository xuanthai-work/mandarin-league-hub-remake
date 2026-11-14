import {
  Check,
  Clock,
  ExternalLink,
  MessageCircle,
  PlayCircle,
  RotateCcw,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PRIORITY_TONE,
  deptTag,
  deptTone,
  dueBadgeTone,
  dueLabel,
  initials,
  myActionLabel,
  priorityLabel,
  submittedTasks,
  type GroupedTask,
  type MyTaskAction,
  type TaskRights,
} from "./shared";

interface TaskKanbanCardProps {
  group: GroupedTask;
  /** Signed URL of the single assignee's avatar, when they have one. */
  avatarUrl?: string | undefined;
  /** True inside the "Chờ duyệt báo cáo" column: evidence + fast review actions. */
  inReview: boolean;
  rights: TaskRights;
  myAction: MyTaskAction | null;
  onOpen: () => void;
  onApprove: (group: GroupedTask) => void;
  onRequestRevision: (group: GroupedTask) => void;
  onMyAction: (group: GroupedTask, action: MyTaskAction) => void;
  /** Deletion now lives in TaskDetailModal; kept so the board can keep passing it. */
  onRemove: (group: GroupedTask) => void;
  onFilterPerson: (memberId: string) => void;
}

const MAX_AVATARS = 3;

export function TaskKanbanCard({
  group,
  avatarUrl,
  inReview,
  rights,
  myAction,
  onOpen,
  onApprove,
  onRequestRevision,
  onMyAction,
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

      <h3 className="mt-2 break-words text-[13px] font-semibold leading-snug text-foreground">
        {group.title}
      </h3>

      {group.status === "revision" && revisionNote && (
        <p className="mt-2 line-clamp-2 rounded-lg bg-destructive/5 px-2 py-1 text-[10px] text-destructive">
          Làm lại: {revisionNote}
        </p>
      )}

      {inReview && (
        <div
          className="mt-2.5 space-y-2 rounded-xl border border-warning-foreground/25 bg-warning-soft/40 p-2.5"
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

          {rights.review && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="admin-sm"
                onClick={() => onApprove(group)}
                className="h-7 gap-1 bg-success px-2.5 text-[11px] text-success-foreground hover:bg-success/90 [&_svg]:size-3.5"
              >
                <Check aria-hidden /> Duyệt (+{pendingPoints}đ)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="admin-sm"
                onClick={() => onRequestRevision(group)}
                className="h-7 gap-1 px-2.5 text-[11px] [&_svg]:size-3.5"
              >
                <RotateCcw aria-hidden /> Làm lại
              </Button>
            </div>
          )}
        </div>
      )}

      {myAction && (
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            size="admin-sm"
            onClick={() => onMyAction(group, myAction)}
            className="mt-2 h-7 w-full gap-1 text-[11px] [&_svg]:size-3.5"
          >
            {myAction === "submit" ? <Send aria-hidden /> : <PlayCircle aria-hidden />}
            {myActionLabel(group.rawTasks[0]!, myAction)}
          </Button>
        </div>
      )}

      {/* Footer: due date (left) | points + assignees (right) */}
      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t border-border/50 pt-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className={cn(
            "inline-flex min-w-0 items-center gap-1 whitespace-nowrap text-[11px]",
            dueBadgeTone(group.due_on),
          )}
        >
          <Clock aria-hidden className="h-3 w-3" />
          {dueLabel(group.due_on, group.status)}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="shrink-0 rounded-md border border-gold/40 bg-gold-soft/40 px-1.5 py-0.5 text-[10px] font-bold text-primary-deep">
            +{group.points}đ
          </span>
          <div className="flex -space-x-1.5" title={names.join(", ")}>
            {visible.map((assignee) => (
              <Button
                key={assignee.taskId}
                type="button"
                variant="ghost"
                onClick={() => onFilterPerson(assignee.id)}
                aria-label={`Lọc nhiệm vụ của ${assignee.full_name}`}
                title={`${assignee.full_name} · ${assignee.member_code}`}
                className="h-6 w-6 overflow-hidden rounded-full bg-primary/15 p-0 text-[10px] font-bold text-primary ring-2 ring-card transition-transform hover:-translate-y-0.5 hover:bg-primary/25 hover:text-primary"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(assignee.full_name)
                )}
              </Button>
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
