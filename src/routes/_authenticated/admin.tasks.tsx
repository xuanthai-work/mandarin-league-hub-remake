import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useConfirm } from "@/components/admin/kit/useConfirm";
import { Button } from "@/components/ui/button";
import { TaskCreateModal } from "@/components/admin/tasks/TaskCreateModal";
import { TaskDetailModal } from "@/components/admin/tasks/TaskDetailModal";
import { TaskFilterToolbar } from "@/components/admin/tasks/TaskFilterToolbar";
import { TaskKanbanBoard } from "@/components/admin/tasks/TaskKanbanBoard";
import { TaskReviewDialog } from "@/components/admin/tasks/TaskReviewDialog";
import { TaskSubmitDialog } from "@/components/admin/tasks/TaskSubmitDialog";
import {
  EMPTY_TASK_FILTERS,
  groupRights,
  groupTasks,
  myTaskAction,
  submittedTasks,
  taskRights,
  type GroupedTask,
  type MyTaskAction,
  type Task,
  type TaskFilters,
  type TaskMember,
  type TaskViewer,
} from "@/components/admin/tasks/shared";
import { supabase } from "@/integrations/supabase/client";
import { can } from "@/lib/permission-catalog";
import { getAssignableMembers, getTaskPeople } from "@/lib/tasks.functions";
import { matchesSearch } from "@/lib/search";
import { useAdminAccess } from "./admin";

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

  const access = useAdminAccess().data;
  const canCreate = !!(access && can(access.perms, "tasks.create"));
  const canViewAll = !!(access && can(access.perms, "tasks.view"));

  const fetchAssignableMembers = useServerFn(getAssignableMembers);
  const fetchTaskPeople = useServerFn(getTaskPeople);

  const members = useQuery({
    queryKey: ["task-members"],
    enabled: canCreate,
    queryFn: async () => (await fetchAssignableMembers()) as TaskMember[],
  });
  const taskPeople = useQuery({
    queryKey: ["task-people"],
    queryFn: async () => (await fetchTaskPeople()) as TaskMember[],
  });
  const tasks = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: async () =>
      ((await supabase.from("tasks").select("*").order("created_at", { ascending: false })).data ??
        []) as Task[],
  });
  const me = useQuery({
    queryKey: ["task-viewer-me"],
    queryFn: async () => {
      const [{ data }, { data: session }] = await Promise.all([
        supabase.rpc("my_account"),
        supabase.auth.getSession(),
      ]);
      const m = (
        data as { member?: { id?: string; full_name?: string; position?: string } | null } | null
      )?.member;
      return {
        label: m?.full_name ? `${m.full_name}${m.position ? ` · ${m.position}` : ""}` : "",
        memberId: m?.id ?? null,
        userId: session.session?.user.id ?? "",
      };
    },
  });
  const viewer: TaskViewer | null =
    access && me.data?.userId
      ? {
          userId: me.data.userId,
          memberId: me.data.memberId,
          department: access.department,
          perms: access.perms,
        }
      : null;

  const [filters, setFilters] = useState<TaskFilters>(EMPTY_TASK_FILTERS);
  const [person, setPerson] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupedTask | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [submitTarget, setSubmitTarget] = useState<Task | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [err, setErr] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-tasks"] });
    qc.invalidateQueries({ queryKey: ["task-members"] });
    qc.invalidateQueries({ queryKey: ["task-people"] });
  };

  const all = useMemo(() => tasks.data ?? [], [tasks.data]);
  const memberList = useMemo(() => (members.data ?? []) as TaskMember[], [members.data]);
  const people = useMemo(() => {
    const map = new Map<string, TaskMember>();
    for (const m of [...(taskPeople.data ?? []), ...memberList]) map.set(m.id, m);
    return [...map.values()];
  }, [taskPeople.data, memberList]);
  const memberById = useMemo(() => new Map(people.map((m) => [m.id, m])), [people]);

  const depts = useMemo(
    () =>
      [...new Set([...people.map((m) => m.department), ...all.map((t) => t.department)])].filter(
        Boolean,
      ),
    [people, all],
  );
  const givers = useMemo(
    () => [...new Set(all.map((t) => t.assigned_by_name).filter(Boolean))],
    [all],
  );

  /** Search + non-status filters, shared by the status pills and the visible rows. */
  const scoped = useMemo(() => {
    return all.filter((task) => {
      const member = memberById.get(task.assignee_id);
      const matchesTerm = matchesSearch(
        `${task.title} ${task.description} ${member?.full_name ?? ""} ${member?.member_code ?? ""}`,
        filters.q,
      );
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
  const groups = useMemo(() => groupTasks(scoped, people), [scoped, people]);

  const startTask = async (task: Task) => {
    const { error } = await supabase.rpc("member_update_task", {
      _task: task.id,
      _action: "start",
      _evidence: "",
      _note: "",
    });
    if (error) return void toast.error(error.message);
    toast.success("Đã tiếp nhận nhiệm vụ");
    refresh();
  };

  const submitReport = async (evidence: string, note: string) => {
    if (!submitTarget) return;
    setSubmitBusy(true);
    const { error } = await supabase.rpc("member_update_task", {
      _task: submitTarget.id,
      _action: "submit",
      _evidence: evidence,
      _note: note,
    });
    setSubmitBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Đã nộp báo cáo, chờ người giao việc duyệt");
    setSubmitTarget(null);
    refresh();
  };

  const runMyAction = (group: GroupedTask, action: MyTaskAction) => {
    const task = group.rawTasks[0];
    if (!task) return;
    if (action === "start") void startTask(task);
    else setSubmitTarget(task);
  };
  const myActionFromModal = (group: GroupedTask, action: MyTaskAction) => {
    setSelectedGroup(null);
    runMyAction(group, action);
  };

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
    if (ok) {
      toast.success("Đã gửi yêu cầu làm lại");
      setReviewTarget(null);
    }
  };

  const removeTasks = async (title: string, targets: Task[]) => {
    if (targets.length === 0) {
      toast.info("Nhiệm vụ đã hoàn thành nên không xóa được");
      return;
    }
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
    toast.success(targets.length > 1 ? `Đã xóa ${targets.length} nhiệm vụ` : "Đã xóa nhiệm vụ");
    refresh();
  };

  const approveGroup = async (group: GroupedTask) => {
    const targets = submittedTasks(group).filter((t) => taskRights(t, viewer).review);
    if (targets.length === 0) return;
    const points = targets.reduce((sum, task) => sum + (task.points || 0), 0);
    const ok = await confirm({
      title: "Duyệt hoàn thành?",
      description:
        targets.length > 1
          ? `“${group.title}”: ${targets.length} báo cáo sẽ được duyệt và cộng tổng ${points} điểm đóng góp.`
          : `“${group.title}” sẽ được duyệt và cộng ${points} điểm đóng góp cho người thực hiện.`,
      confirmLabel: "Duyệt và cộng điểm",
    });
    if (!ok) return;
    if (await reviewTasks(targets, true)) toast.success(`Đã duyệt và cộng ${points} điểm`);
  };
  const reviseGroup = (group: GroupedTask) =>
    openRevision(
      group.title,
      submittedTasks(group).filter((t) => taskRights(t, viewer).review),
    );
  const removeGroup = (group: GroupedTask) => {
    const targets = group.rawTasks.filter((task) => taskRights(task, viewer).remove);
    if (targets.length === 0) {
      if (group.rawTasks.every((t) => t.status === "done")) {
        toast.info("Nhiệm vụ đã hoàn thành nên không xóa được");
      } else {
        toast.error("Chỉ người giao việc mới được xóa nhiệm vụ này");
      }
      return;
    }
    void removeTasks(group.title, targets);
  };

  /** Modal actions close the detail view first so the board reflects the new state. */
  const approveFromModal = (group: GroupedTask) => {
    setSelectedGroup(null);
    void approveGroup(group);
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
    <div className="mx-auto max-w-7xl space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      {dialog}
      <AdminPageHeader
        title="Nhiệm vụ"
        description={
          canViewAll
            ? "Giao việc, nghiệm thu và tự động cộng điểm khi duyệt hoàn thành. Chỉ người giao việc mới sửa, xóa hoặc duyệt được nhiệm vụ của mình."
            : "Nhiệm vụ được giao cho bạn. Bấm Tiếp nhận để bắt đầu, làm xong thì Nộp báo cáo để người giao việc duyệt và cộng điểm."
        }
        actions={
          canCreate ? (
            <Button
              type="button"
              size="admin"
              onClick={() => setCreating(true)}
              aria-label="Giao nhiệm vụ"
              title="Giao nhiệm vụ"
            >
              <Plus aria-hidden />
              <span className="hidden sm:inline">Giao nhiệm vụ</span>
            </Button>
          ) : undefined
        }
      />

      <TaskFilterToolbar filters={filters} depts={depts} givers={givers} onChange={setFilters} />

      {person && (
        <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
          Đang xem nhiệm vụ của <b>{memberById.get(person)?.full_name ?? "thành viên"}</b> ·{" "}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs font-medium underline"
            onClick={() => setPerson("")}
          >
            Xem tất cả
          </Button>
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
          rightsOf={(g) => groupRights(g, viewer)}
          actionOf={(g) => (g.rawTasks[0] ? myTaskAction(g.rawTasks[0], viewer) : null)}
          onSelectGroup={(group) => setSelectedGroup(group)}
          onApprove={approveGroup}
          onRequestRevision={reviseGroup}
          onMyAction={runMyAction}
          onRemove={removeGroup}
          onFilterPerson={(id) => setPerson(id)}
        />
      )}

      <AnimatePresence>
        {creating && canCreate && (
          <TaskCreateModal
            key="create-task"
            members={memberList}
            meLabel={me.data?.label ?? ""}
            onClose={() => setCreating(false)}
            onCreated={refresh}
          />
        )}
        {selectedGroup && (
          <TaskDetailModal
            key={`detail-${selectedGroup.key}`}
            group={selectedGroup}
            members={people}
            rights={groupRights(selectedGroup, viewer)}
            myAction={
              selectedGroup.rawTasks[0] ? myTaskAction(selectedGroup.rawTasks[0], viewer) : null
            }
            isMine={selectedGroup.rawTasks[0]?.assignee_id === viewer?.memberId}
            onClose={() => setSelectedGroup(null)}
            onUpdated={refresh}
            onApprove={approveFromModal}
            onRequestRevision={reviseFromModal}
            onMyAction={myActionFromModal}
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

      <TaskSubmitDialog
        title={submitTarget?.title ?? null}
        busy={submitBusy}
        onClose={() => setSubmitTarget(null)}
        onConfirm={(evidence, note) => void submitReport(evidence, note)}
      />
    </div>
  );
}
