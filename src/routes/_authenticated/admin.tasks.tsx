import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useConfirm } from "@/components/admin/Trash";
import { TaskCreateModal } from "@/components/admin/tasks/TaskCreateModal";
import { TaskDetailModal } from "@/components/admin/tasks/TaskDetailModal";
import { TaskFilterToolbar } from "@/components/admin/tasks/TaskFilterToolbar";
import { TaskKanbanBoard } from "@/components/admin/tasks/TaskKanbanBoard";
import { TaskReviewDialog } from "@/components/admin/tasks/TaskReviewDialog";
import {
  EMPTY_TASK_FILTERS,
  groupTasks,
  submittedTasks,
  type GroupedTask,
  type Task,
  type TaskFilters,
  type TaskMember,
} from "@/components/admin/tasks/shared";
import { supabase } from "@/integrations/supabase/client";
import { getAssignableMembers } from "@/lib/tasks.functions";

export const Route = createFileRoute("/_authenticated/admin/tasks")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Nhiệm vụ | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: TasksPage,
});

/** A review action applies to one raw task or to every member of a grouped task. */
interface ReviewTarget {
  title: string;
  tasks: Task[];
}

function TasksPage() {
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();

  const fetchAssignableMembers = useServerFn(getAssignableMembers);
  const members = useQuery({
    queryKey: ["task-members"],
    queryFn: async () => (await fetchAssignableMembers()) as TaskMember[],
  });
  const tasks = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: async () =>
      ((await supabase.from("tasks").select("*").order("created_at", { ascending: false })).data ??
        []) as Task[],
  });
  const me = useQuery({
    queryKey: ["me-label"],
    queryFn: async () => {
      const { data } = await supabase.rpc("my_account");
      const m = (data as { member?: { full_name?: string; position?: string } | null } | null)
        ?.member;
      return m?.full_name ? `${m.full_name}${m.position ? ` · ${m.position}` : ""}` : "";
    },
  });

  const [filters, setFilters] = useState<TaskFilters>(EMPTY_TASK_FILTERS);
  const [person, setPerson] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupedTask | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [err, setErr] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-tasks"] });
    qc.invalidateQueries({ queryKey: ["task-members"] });
  };

  const all = useMemo(() => tasks.data ?? [], [tasks.data]);
  const memberList = useMemo(() => (members.data ?? []) as TaskMember[], [members.data]);
  const memberById = useMemo(() => new Map(memberList.map((m) => [m.id, m])), [memberList]);

  const depts = useMemo(
    () =>
      [
        ...new Set([...memberList.map((m) => m.department), ...all.map((t) => t.department)]),
      ].filter(Boolean),
    [memberList, all],
  );
  const givers = useMemo(
    () => [...new Set(all.map((t) => t.assigned_by_name).filter(Boolean))],
    [all],
  );

  /** Search + non-status filters, shared by the status pills and the visible rows. */
  const scoped = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    return all.filter((task) => {
      const member = memberById.get(task.assignee_id);
      const matchesTerm =
        !term ||
        task.title.toLowerCase().includes(term) ||
        task.description.toLowerCase().includes(term) ||
        (member?.full_name.toLowerCase().includes(term) ?? false) ||
        (member?.member_code.toLowerCase().includes(term) ?? false);
      return (
        matchesTerm &&
        (!filters.dept || task.department === filters.dept) &&
        (!filters.priority || task.priority === filters.priority) &&
        (!filters.giver || task.assigned_by_name === filters.giver) &&
        (!person || task.assignee_id === person)
      );
    });
  }, [all, filters, person, memberById]);

  /** Board cards: tasks fanned out to a team collapse into one card with stacked avatars. */
  const groups = useMemo(() => groupTasks(scoped, memberList), [scoped, memberList]);

  const reviewTasks = async (targets: Task[], approve: boolean, note = "") => {
    setErr("");
    for (const task of targets) {
      const { error } = await supabase.rpc("review_task", {
        _task: task.id,
        _approve: approve,
        _note: note,
      });
      if (error) {
        setErr(error.message);
        refresh();
        return false;
      }
    }
    refresh();
    return true;
  };

  const openRevision = (title: string, targets: Task[]) => {
    if (targets.length === 0) return;
    setReviewTarget({ title, tasks: targets });
  };

  const confirmRevision = async (note: string) => {
    if (!reviewTarget) return;
    setReviewBusy(true);
    const ok = await reviewTasks(reviewTarget.tasks, false, note);
    setReviewBusy(false);
    if (ok) setReviewTarget(null);
  };

  const removeTasks = async (title: string, targets: Task[]) => {
    const ok = await confirm({
      title: "Xóa nhiệm vụ?",
      description:
        targets.length > 1
          ? `“${title}” cùng ${targets.length - 1} nhiệm vụ trong nhóm sẽ bị xóa vĩnh viễn.`
          : `“${title}” sẽ bị xóa khỏi danh sách và không thể hoàn tác.`,
      confirmLabel: "Xóa nhiệm vụ",
      destructive: true,
    });
    if (!ok) return;
    for (const task of targets) {
      const { error } = await supabase.rpc("delete_task", { _task: task.id });
      if (error) {
        setErr(error.message);
        refresh();
        return;
      }
    }
    refresh();
  };

  const approveGroup = (group: GroupedTask) => void reviewTasks(submittedTasks(group), true);
  const reviseGroup = (group: GroupedTask) => openRevision(group.title, submittedTasks(group));
  const removeGroup = (group: GroupedTask) =>
    void removeTasks(
      group.title,
      group.rawTasks.filter((task) => task.status !== "done"),
    );

  /** Modal actions close the detail view first so the board reflects the new state. */
  const approveFromModal = (group: GroupedTask) => {
    setSelectedGroup(null);
    approveGroup(group);
  };
  const reviseFromModal = (group: GroupedTask) => {
    setSelectedGroup(null);
    reviseGroup(group);
  };
  const removeFromModal = (group: GroupedTask) => {
    setSelectedGroup(null);
    removeGroup(group);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      {dialog}
      <AdminPageHeader
        title="Nhiệm vụ"
        description="Giao việc, nghiệm thu và tự động cộng điểm khi duyệt hoàn thành. Trưởng Ban chỉ quản lý Ban mình."
        actions={
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label="Giao nhiệm vụ"
            title="Giao nhiệm vụ"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-2.5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-4"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Giao nhiệm vụ</span>
          </button>
        }
      />

      <TaskFilterToolbar
        filters={filters}
        depts={depts}
        givers={givers}
        shown={groups.length}
        total={all.length}
        onChange={setFilters}
        onReset={() => {
          setFilters(EMPTY_TASK_FILTERS);
          setPerson("");
        }}
      />

      {person && (
        <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
          Đang xem nhiệm vụ của <b>{memberById.get(person)?.full_name ?? "thành viên"}</b> ·{" "}
          <button
            type="button"
            onClick={() => setPerson("")}
            className="font-medium text-primary underline"
          >
            Xem tất cả
          </button>
        </p>
      )}

      {err && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
      )}

      {tasks.isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Đang tải nhiệm vụ…
        </div>
      ) : (
        <TaskKanbanBoard
          groups={groups}
          onSelectGroup={(group) => setSelectedGroup(group)}
          onApprove={approveGroup}
          onRequestRevision={reviseGroup}
          onRemove={removeGroup}
          onFilterPerson={(id) => setPerson(id)}
        />
      )}

      <AnimatePresence>
        {creating && (
          <TaskCreateModal
            key="create-task"
            members={memberList}
            meLabel={me.data ?? ""}
            onClose={() => setCreating(false)}
            onCreated={refresh}
          />
        )}
        {selectedGroup && (
          <TaskDetailModal
            key={`detail-${selectedGroup.key}`}
            group={selectedGroup}
            members={memberList}
            onClose={() => setSelectedGroup(null)}
            onUpdated={refresh}
            onApprove={approveFromModal}
            onRequestRevision={reviseFromModal}
            onRemove={removeFromModal}
          />
        )}
      </AnimatePresence>

      <TaskReviewDialog
        title={reviewTarget?.title ?? null}
        busy={reviewBusy}
        onClose={() => setReviewTarget(null)}
        onConfirm={(note) => void confirmRevision(note)}
      />
    </div>
  );
}
