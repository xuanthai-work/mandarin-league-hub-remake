import { Eye, Inbox, Plus, Trophy, Zap } from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";
import { TaskKanbanCard } from "./TaskKanbanCard";
import { BOARD_COLUMNS, dueDiff, type GroupedTask } from "./shared";

interface TaskKanbanBoardProps {
  groups: GroupedTask[];
  onCreate: () => void;
  onApprove: (group: GroupedTask) => void;
  onRequestRevision: (group: GroupedTask) => void;
  onRemove: (group: GroupedTask) => void;
  onFilterPerson: (memberId: string) => void;
}

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  todo: Inbox,
  in_progress: Zap,
  review: Eye,
  done: Trophy,
};

/** Soonest deadline first, undated tasks last. */
function byDeadline(a: GroupedTask, b: GroupedTask) {
  const left = dueDiff(a.due_on);
  const right = dueDiff(b.due_on);
  if (left === null && right === null) return a.title.localeCompare(b.title, "vi");
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

export function TaskKanbanBoard({
  groups,
  onCreate,
  onApprove,
  onRequestRevision,
  onRemove,
  onFilterPerson,
}: TaskKanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {BOARD_COLUMNS.map((column) => {
        const Icon = ICONS[column.key] ?? Inbox;
        const items = groups
          .filter((group) => column.statuses.includes(group.status))
          .sort(byDeadline);
        const needsAttention = column.key === "review" && items.length > 0;

        return (
          <section
            key={column.key}
            aria-label={column.label}
            className={cn("flex flex-col rounded-2xl border p-3", column.accent)}
          >
            <header className="flex items-center gap-2 px-0.5 pb-2.5">
              <span
                className={cn("grid h-7 w-7 place-items-center rounded-xl", column.tone)}
                aria-hidden
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-[11px] font-bold uppercase tracking-wide text-foreground">
                  {column.label}
                </h2>
                <p className="truncate text-[10px] text-muted-foreground">{column.hint}</p>
              </div>
              <span
                className={cn(
                  "ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground",
                  needsAttention && "border-amber-400/60 text-amber-700 dark:text-amber-300",
                )}
              >
                {needsAttention && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                  </span>
                )}
                {items.length}
              </span>
              <button
                type="button"
                onClick={onCreate}
                aria-label="Giao nhiệm vụ mới"
                title="Giao nhiệm vụ mới"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-primary"
              >
                <Plus aria-hidden className="h-3.5 w-3.5" />
              </button>
            </header>

            <div className="custom-scrollbar max-h-[calc(100vh-280px)] space-y-3 overflow-y-auto p-1">
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/80 px-3 py-8 text-center text-[11px] text-muted-foreground">
                  Chưa có việc ở bước này
                </p>
              ) : (
                items.map((group) => (
                  <TaskKanbanCard
                    key={group.key}
                    group={group}
                    inReview={column.key === "review"}
                    onApprove={onApprove}
                    onRequestRevision={onRequestRevision}
                    onRemove={onRemove}
                    onFilterPerson={onFilterPerson}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
