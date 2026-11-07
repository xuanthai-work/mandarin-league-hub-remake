import { useState, type ComponentType, type ReactNode } from "react";
import { Eye, Inbox, Trophy, Zap } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { TaskKanbanCard } from "./TaskKanbanCard";
import {
  BOARD_COLUMNS,
  NO_TASK_RIGHTS,
  columnOf,
  dueDiff,
  type DropAction,
  type GroupedTask,
  type MyTaskAction,
  type TaskRights,
} from "./shared";

interface TaskKanbanBoardProps {
  groups: GroupedTask[];
  rightsOf: (group: GroupedTask) => TaskRights;
  actionOf: (group: GroupedTask) => MyTaskAction | null;
  dropActionOf: (group: GroupedTask, targetColumn: string) => DropAction | null;
  onDropAction: (group: GroupedTask, action: DropAction) => void;
  onSelectGroup: (group: GroupedTask) => void;
  onApprove: (group: GroupedTask) => void;
  onRequestRevision: (group: GroupedTask) => void;
  onMyAction: (group: GroupedTask, action: MyTaskAction) => void;
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

type BoardColumnProps = {
  column: (typeof BOARD_COLUMNS)[number];
  activeGroup: GroupedTask | null;
  dropActionOf: (group: GroupedTask, targetColumn: string) => DropAction | null;
  children: ReactNode;
  itemCount: number;
  needsAttention: boolean;
};

function BoardColumn({
  column,
  activeGroup,
  dropActionOf,
  children,
  itemCount,
  needsAttention,
}: BoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: column.key });
  const Icon = ICONS[column.key] ?? Inbox;

  let highlightClass = "";
  if (activeGroup) {
    const action = dropActionOf(activeGroup, column.key);
    const isOrigin = columnOf(activeGroup.status) === column.key;
    if (action !== null) {
      highlightClass = isOver ? "ring-2 ring-primary bg-primary/5" : "ring-2 ring-primary/40";
    } else if (!isOrigin) {
      highlightClass = "opacity-60";
    }
  }

  return (
    <section
      ref={setNodeRef}
      aria-label={column.label}
      className={cn(
        "flex flex-col rounded-2xl border p-3 transition-all",
        column.accent,
        highlightClass,
      )}
    >
      <header className="flex items-center gap-2 px-0.5 pb-2.5">
        <span className={cn("grid h-7 w-7 place-items-center rounded-xl", column.tone)} aria-hidden>
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
            needsAttention && "border-warning-foreground/40 text-warning-foreground",
          )}
        >
          {needsAttention && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning-foreground opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning-foreground" />
            </span>
          )}
          {itemCount}
        </span>
      </header>

      <div className="custom-scrollbar max-h-[calc(100vh-230px)] space-y-3 overflow-y-auto p-1">
        {children}
      </div>
    </section>
  );
}

function DraggableCard({
  group,
  draggable,
  children,
}: {
  group: GroupedTask;
  draggable: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: group.key,
    disabled: !draggable,
  });
  return (
    <div
      ref={setNodeRef}
      {...(draggable ? listeners : {})}
      className={cn(draggable && "cursor-grab touch-manipulation", isDragging && "opacity-40")}
    >
      {children}
    </div>
  );
}

export function TaskKanbanBoard({
  groups,
  rightsOf,
  actionOf,
  dropActionOf,
  onDropAction,
  onSelectGroup,
  onApprove,
  onRequestRevision,
  onMyAction,
  onRemove,
  onFilterPerson,
}: TaskKanbanBoardProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const activeGroup = activeKey ? (groups.find((g) => g.key === activeKey) ?? null) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveKey(String(event.active.id));
  };

  const handleDragCancel = () => {
    setActiveKey(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const key = String(event.active.id);
    setActiveKey(null);
    const group = groups.find((g) => g.key === key);
    if (!group) return;
    const target = event.over ? String(event.over.id) : null;
    if (!target) return;
    const action = dropActionOf(group, target);
    if (action !== null) {
      onDropAction(group, action);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {BOARD_COLUMNS.map((column) => {
          const items = groups
            .filter((group) => column.statuses.includes(group.status))
            .sort(byDeadline);
          const needsAttention = column.key === "review" && items.length > 0;

          return (
            <BoardColumn
              key={column.key}
              column={column}
              activeGroup={activeGroup}
              dropActionOf={dropActionOf}
              itemCount={items.length}
              needsAttention={needsAttention}
            >
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/80 px-3 py-8 text-center text-[11px] text-muted-foreground">
                  Chưa có việc ở bước này
                </p>
              ) : (
                items.map((group) => {
                  const draggable = BOARD_COLUMNS.some((c) => dropActionOf(group, c.key) !== null);
                  return (
                    <DraggableCard key={group.key} group={group} draggable={draggable}>
                      <TaskKanbanCard
                        group={group}
                        inReview={column.key === "review"}
                        rights={rightsOf(group)}
                        myAction={actionOf(group)}
                        onOpen={() => onSelectGroup(group)}
                        onApprove={onApprove}
                        onRequestRevision={onRequestRevision}
                        onMyAction={onMyAction}
                        onRemove={onRemove}
                        onFilterPerson={onFilterPerson}
                      />
                    </DraggableCard>
                  );
                })
              )}
            </BoardColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeGroup && (
          <div className="pointer-events-none rotate-1 rounded-2xl shadow-xl">
            <TaskKanbanCard
              group={activeGroup}
              inReview={false}
              rights={NO_TASK_RIGHTS}
              myAction={null}
              onOpen={() => {}}
              onApprove={() => {}}
              onRequestRevision={() => {}}
              onMyAction={() => {}}
              onRemove={() => {}}
              onFilterPerson={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
