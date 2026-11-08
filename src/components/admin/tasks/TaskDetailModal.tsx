import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  ClipboardList,
  Loader2,
  PlayCircle,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
import { MemberAvatar } from "@/components/admin/kit/MemberAvatar";
import { AdminModal } from "@/components/admin/kit/AdminModal";
import { FormField } from "@/components/admin/kit/FormField";
import { TaskEvidence } from "@/components/portal/TaskEvidence";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { updateTask } from "@/lib/tasks.functions";
import { TASK_STATUS } from "@/lib/points";
import { deptName } from "@/lib/recruitment";
import { cn } from "@/lib/utils";
import {
  POINT_OPTIONS,
  TASK_LABEL,
  TaskAttachmentsEditor,
  TaskPointPicker,
  TaskPrioritySelect,
  type TaskPriority,
  toTaskPriority,
  useAutoGrow,
} from "./TaskFormParts";
import {
  deptTag,
  deptTone,
  myActionLabel,
  parseAttachments,
  serializeDescription,
  submittedTasks,
  type GroupedTask,
  type MyTaskAction,
  type TaskAttachment,
  type TaskMember,
  type TaskRights,
} from "./shared";

interface TaskDetailModalProps {
  group: GroupedTask;
  members: TaskMember[];
  /** `avatar_path → signed URL` for the assignee list. */
  avatarMap?: Map<string, string> | undefined;
  rights: TaskRights;
  myAction: MyTaskAction | null;
  isMine: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onApprove: (group: GroupedTask) => void;
  onRequestRevision: (group: GroupedTask) => void;
  onMyAction: (group: GroupedTask, action: MyTaskAction) => void;
  onRemove: (group: GroupedTask) => void;
}

export function TaskDetailModal({
  group,
  members,
  avatarMap,
  rights,
  myAction,
  isMine,
  onClose,
  onUpdated,
  onApprove,
  onRequestRevision,
  onMyAction,
  onRemove,
}: TaskDetailModalProps) {
  const update = useServerFn(updateTask);
  const primary = group.rawTasks[0]!;
  const pending = submittedTasks(group);
  const pendingPoints = pending.reduce((sum, task) => sum + (task.points || 0), 0);
  const reported = group.rawTasks.filter((task) => task.evidence_url);
  const revisionNote = group.rawTasks.find((task) => task.review_note)?.review_note ?? "";
  const tone = deptTone(group.department);

  /** Documents live inside `description`; the editor keeps prose and chips apart. */
  const parsed = useMemo(() => parseAttachments(group.description), [group.description]);

  const [title, setTitle] = useState(group.title);
  const [description, setDescription] = useState(parsed.description);
  const [attachments, setAttachments] = useState<TaskAttachment[]>(parsed.attachments);
  const [priority, setPriority] = useState<TaskPriority>(toTaskPriority(group.priority));
  const [due, setDue] = useState(primary.due_on ?? group.due_on ?? "");
  const [points, setPoints] = useState(primary.points);
  const [note, setNote] = useState(group.assigned_by_note);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  /** Legacy tasks may carry a point value outside the standard 5/10/20 scale. */
  const isCustomPoints = !POINT_OPTIONS.some((opt) => opt.value === points);
  const textRef = useAutoGrow(description);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  /** The assignee is read-only here: a task keeps its single responsible member. */
  const assigneeId = primary.assignee_id;

  const save = async () => {
    if (!rights.edit) return;
    setErr("");
    if (title.trim().length < 3) return setErr("Tên nhiệm vụ tối thiểu 3 ký tự.");
    if (!assigneeId) return setErr("Vui lòng chọn người phụ trách.");
    const stored = serializeDescription(description, attachments);
    if (stored.length > 3000) {
      setErr("Mô tả và tài liệu vượt quá 3.000 ký tự, vui lòng rút gọn.");
      return;
    }
    setBusy(true);
    try {
      // Common fields follow every row of a legacy group card; the assignee only moves the primary row.
      for (const task of group.rawTasks) {
        await update({
          data: {
            taskId: task.id,
            title: title.trim(),
            description: stored,
            priority,
            due_on: due || null,
            points,
            assignee_id: task.id === primary.id ? assigneeId : undefined,
            assigned_by_note: note.trim(),
          },
        });
      }
      toast.success("Đã lưu thay đổi nhiệm vụ");
      onUpdated();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <AdminModal
      size="xl"
      icon={ClipboardList}
      title="Chi tiết nhiệm vụ"
      description={
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tone.tag)}>
            {deptTag(group.department)}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              TASK_STATUS[group.status]?.className ?? "bg-secondary text-foreground",
            )}
          >
            {TASK_STATUS[group.status]?.label ?? group.status}
          </span>
          {group.assignees.length > 1 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {group.assignees.length} người thực hiện
            </span>
          )}
        </span>
      }
      onClose={onClose}
      dismissible={!busy}
      bodyClassName="grid gap-6 lg:grid-cols-12"
      footer={
        <div className="space-y-2">
          {err && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>
          )}
          {!rights.edit && (group.status === "done" || !isMine) && (
            <p className="text-xs text-muted-foreground">
              {group.status === "done"
                ? "Nhiệm vụ đã hoàn thành nên không chỉnh sửa được."
                : `Chỉ người giao việc (${group.assigned_by_name || "không rõ"}) hoặc Quản trị viên mới sửa, xóa hay duyệt được nhiệm vụ này.`}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {rights.remove && (
              <Button
                type="button"
                variant="ghost"
                size="admin-sm"
                onClick={() => onRemove(group)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:size-3.5"
              >
                <Trash2 aria-hidden /> Xóa nhiệm vụ
              </Button>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {myAction && (
                <Button type="button" size="admin-lg" onClick={() => onMyAction(group, myAction)}>
                  {myAction === "submit" ? <Send aria-hidden /> : <PlayCircle aria-hidden />}
                  {myActionLabel(primary, myAction)}
                </Button>
              )}
              {pending.length > 0 && rights.review && (
                <>
                  <Button
                    type="button"
                    size="admin"
                    onClick={() => onApprove(group)}
                    className="bg-success text-success-foreground hover:bg-success/90 [&_svg]:size-3.5"
                  >
                    <Check aria-hidden /> Duyệt hoàn thành (+{pendingPoints}đ)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="admin"
                    onClick={() => onRequestRevision(group)}
                    className="[&_svg]:size-3.5"
                  >
                    <RotateCcw aria-hidden /> Yêu cầu làm lại
                  </Button>
                </>
              )}
              {rights.edit && (
                <Button type="button" size="admin-lg" onClick={() => void save()} disabled={busy}>
                  {busy ? <Loader2 aria-hidden className="animate-spin" /> : <Save aria-hidden />}
                  {busy ? "Đang lưu…" : "Lưu thay đổi"}
                </Button>
              )}
            </div>
          </div>
        </div>
      }
    >
      {/* Left: the work itself */}
      <div className="min-w-0 space-y-4 lg:col-span-7">
        <FormField label="Tiêu đề nhiệm vụ" required>
          {(f) => (
            <AdminInput
              {...f}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={!rights.edit}
              maxLength={200}
              className="h-auto border-transparent bg-transparent px-2.5 py-1.5 text-sm font-semibold shadow-none placeholder:font-normal hover:border-border focus-visible:border-input"
            />
          )}
        </FormField>

        <div className="space-y-2">
          <FormField label="Mô tả / yêu cầu công việc">
            {(f) => (
              <AdminTextarea
                {...f}
                ref={textRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                readOnly={!rights.edit}
                maxLength={3000}
                rows={3}
                placeholder="Mô tả kết quả cần đạt, minh chứng cần nộp…"
                className="resize-none text-xs leading-relaxed"
              />
            )}
          </FormField>
          <TaskAttachmentsEditor
            attachments={attachments}
            onChange={setAttachments}
            readOnly={!rights.edit}
          />
        </div>

        {reported.length > 0 && (
          <section className="space-y-2">
            <h3 className={TASK_LABEL}>Minh chứng báo cáo</h3>
            {reported.map((task) => (
              <div key={task.id} className="rounded-xl border border-border bg-secondary/20 p-2.5">
                <p className="text-[11px] font-semibold text-foreground">
                  {memberById.get(task.assignee_id)?.full_name ?? "Thành viên"}
                </p>
                <TaskEvidence value={task.evidence_url} note={task.report_note} />
              </div>
            ))}
          </section>
        )}

        {revisionNote && (
          <section className="space-y-1.5">
            <h3 className={TASK_LABEL}>Phản hồi yêu cầu làm lại</h3>
            <p className="rounded-xl bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive">
              {revisionNote}
            </p>
          </section>
        )}
      </div>

      {/* Right: attributes */}
      <aside className="space-y-4 lg:col-span-5 lg:border-l lg:border-border/70 lg:pl-6">
        <div className="space-y-1.5">
          <span className={TASK_LABEL}>
            Người phụ trách
            {group.assignees.length > 1 && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-primary">
                {group.assignees.length} người
              </span>
            )}
          </span>
          <ul className="space-y-1.5">
            {group.assignees.map((person) => (
              <li
                key={person.taskId}
                className="flex items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/5 p-2.5"
              >
                <MemberAvatar
                  src={person.avatar_path ? avatarMap?.get(person.avatar_path) : null}
                  name={person.full_name}
                  className="h-10 w-10 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {person.full_name}
                  </p>
                  <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="font-mono">{person.member_code}</span>
                    <span className="text-border">·</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        deptTone(person.department).tag,
                      )}
                    >
                      {deptName(person.department)}
                    </span>
                  </p>
                </div>
                {group.assignees.length > 1 && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      TASK_STATUS[person.status]?.className ?? "bg-secondary text-foreground",
                    )}
                  >
                    {TASK_STATUS[person.status]?.label ?? person.status}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Mức độ ưu tiên">
            {(f) => (
              <TaskPrioritySelect
                id={f.id}
                value={priority}
                onChange={setPriority}
                disabled={!rights.edit}
              />
            )}
          </FormField>

          <FormField label="Hạn chót">
            {(f) => (
              <DatePicker
                id={f.id}
                value={due}
                onChange={setDue}
                disabled={!rights.edit}
                placeholder="Chọn hạn"
              />
            )}
          </FormField>
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={TASK_LABEL}>Điểm thưởng cống hiến</span>
            {isCustomPoints && (
              <span className="rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold normal-case text-warning-foreground">
                Hiện tại: {points}đ
              </span>
            )}
          </div>
          <TaskPointPicker value={points} onChange={setPoints} disabled={!rights.edit} />
        </div>

        <div className="space-y-1.5">
          <span className={TASK_LABEL}>Người giao việc</span>
          <p className="text-sm font-medium text-foreground">{group.assigned_by_name || "—"}</p>
          <AdminInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            readOnly={!rights.edit}
            maxLength={200}
            aria-label="Ghi chú người giao"
            placeholder="Ghi chú người giao (tùy chọn)"
            className="text-xs"
          />
        </div>
      </aside>
    </AdminModal>
  );
}
