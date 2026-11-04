import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import {
  Check,
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { TaskEvidence } from "@/components/portal/TaskEvidence";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTask } from "@/lib/tasks.functions";
import { PRIORITY, TASK_STATUS } from "@/lib/points";
import { deptName } from "@/lib/recruitment";
import { cn } from "@/lib/utils";
import {
  deptTag,
  deptTone,
  initials,
  parseAttachments,
  serializeDescription,
  shortUrl,
  submittedTasks,
  type GroupedTask,
  type TaskAttachment,
  type TaskMember,
} from "./shared";

interface TaskDetailModalProps {
  group: GroupedTask;
  members: TaskMember[];
  onClose: () => void;
  onUpdated: () => void;
  onApprove: (group: GroupedTask) => void;
  onRequestRevision: (group: GroupedTask) => void;
  onRemove: (group: GroupedTask) => void;
}

type Priority = "low" | "medium" | "high";

const toPriority = (value: string): Priority =>
  value === "high" || value === "low" ? value : "medium";

const POINT_OPTIONS = [
  { value: 5, label: "5đ", hint: "Việc nhỏ" },
  { value: 10, label: "10đ", hint: "Việc vừa" },
  { value: 20, label: "20đ", hint: "Dự án lớn" },
];

const field =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20";
const label = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

/** Grow a textarea to fit its content, up to a comfortable maximum. */
function useAutoGrow(value: string, max = 260) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [value, max]);
  return ref;
}

export function TaskDetailModal({
  group,
  members,
  onClose,
  onUpdated,
  onApprove,
  onRequestRevision,
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
  const [priority, setPriority] = useState<Priority>(toPriority(group.priority));
  const [due, setDue] = useState(primary.due_on ?? group.due_on ?? "");
  const [points, setPoints] = useState(primary.points);
  const [note, setNote] = useState(group.assigned_by_note);
  const [addingDoc, setAddingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docErr, setDocErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  /** Legacy tasks may carry a point value outside the standard 5/10/20 scale. */
  const isCustomPoints = !POINT_OPTIONS.some((opt) => opt.value === points);
  const textRef = useAutoGrow(description);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  /** The assignee is read-only here: a task keeps its single responsible member. */
  const assigneeId = primary.assignee_id;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Keep the page behind the modal from scrolling while it is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const newDocId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `doc-${Date.now()}`;

  const addAttachment = () => {
    const url = docUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setDocErr("URL phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    setAttachments((list) => [
      ...list,
      { id: newDocId(), title: docTitle.trim() || shortUrl(url), url },
    ]);
    setDocTitle("");
    setDocUrl("");
    setDocErr("");
    setAddingDoc(false);
  };

  const removeAttachment = (id: string) =>
    setAttachments((list) => list.filter((doc) => doc.id !== id));

  const save = async () => {
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết nhiệm vụ ${group.title}`}
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl lg:max-w-5xl xl:max-w-6xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 px-5 py-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
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
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </header>

        <div className="custom-scrollbar grid min-h-0 flex-1 gap-6 overflow-y-auto px-5 py-4 lg:grid-cols-12">
          {/* Left: the work itself */}
          <div className="min-w-0 space-y-4 lg:col-span-7">
            <label className="block space-y-1.5">
              <span className={label}>Tiêu đề nhiệm vụ</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="w-full rounded-xl border border-transparent bg-transparent px-2.5 py-1.5 text-sm font-semibold leading-normal text-foreground transition-colors hover:border-border focus:border-input focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <div className="space-y-2">
              <label className="block space-y-1.5">
                <span className={label}>Mô tả / yêu cầu công việc</span>
                <textarea
                  ref={textRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={3000}
                  rows={3}
                  placeholder="Mô tả kết quả cần đạt, minh chứng cần nộp…"
                  className={`${field} resize-none leading-relaxed`}
                />
              </label>
              <section className="space-y-2">
                {attachments.length > 0 && (
                  <ul className="space-y-1.5">
                    {attachments.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <FileText aria-hidden className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">{doc.title}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {shortUrl(doc.url)}
                          </p>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Mở ${doc.title}`}
                          title="Mở tài liệu"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                        >
                          <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => removeAttachment(doc.id)}
                          aria-label={`Gỡ tài liệu ${doc.title}`}
                          title="Gỡ tài liệu"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X aria-hidden className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {addingDoc ? (
                  <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-2.5">
                    <input
                      autoFocus
                      value={docUrl}
                      onChange={(e) => setDocUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addAttachment();
                        }
                      }}
                      aria-label="URL tài liệu"
                      placeholder="https://drive.google.com/…, https://docs.google.com/…"
                      className={field}
                    />
                    <input
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addAttachment();
                        }
                      }}
                      aria-label="Tên tài liệu"
                      maxLength={120}
                      placeholder="Tên tài liệu (tùy chọn): Brief chiến dịch, File mẫu thiết kế…"
                      className={field}
                    />
                    {docErr && <p className="text-[11px] text-destructive">{docErr}</p>}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={addAttachment}
                        className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        Thêm
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingDoc(false);
                          setDocErr("");
                          setDocUrl("");
                          setDocTitle("");
                        }}
                        className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingDoc(true)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                  >
                    <Paperclip aria-hidden className="h-3.5 w-3.5" />
                    Thêm tài liệu liên quan
                  </button>
                )}
              </section>
            </div>

            {reported.length > 0 && (
              <section className="space-y-2">
                <h3 className={label}>Minh chứng báo cáo</h3>
                {reported.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-border bg-secondary/20 p-2.5"
                  >
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
                <h3 className={label}>Phản hồi yêu cầu làm lại</h3>
                <p className="rounded-xl bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive">
                  {revisionNote}
                </p>
              </section>
            )}
          </div>

          {/* Right: attributes */}
          <aside className="space-y-4 lg:col-span-5 lg:border-l lg:border-border/70 lg:pl-6">
            <div className="space-y-1.5">
              <span className={label}>
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
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {initials(person.full_name)}
                    </span>
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
              <div className="space-y-1.5">
                <span className={label}>Mức độ ưu tiên</span>
                <Select value={priority} onValueChange={(v) => setPriority(toPriority(v))}>
                  <SelectTrigger
                    aria-label="Mức độ ưu tiên"
                    className="h-9 rounded-xl border-input text-xs font-normal"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(PRIORITY).map(([key, text]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className={label}>Hạn chót</span>
                <DatePicker value={due} onChange={setDue} placeholder="Chọn hạn" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={label}>Điểm thưởng cống hiến</span>
                {isCustomPoints && (
                  <span className="rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold normal-case text-warning-foreground">
                    Hiện tại: {points}đ
                  </span>
                )}
              </div>
              <div
                role="group"
                aria-label="Điểm thưởng cống hiến"
                className="grid grid-cols-3 gap-1.5"
              >
                {POINT_OPTIONS.map((opt) => {
                  const active = points === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPoints(opt.value)}
                      aria-pressed={active}
                      className={cn(
                        "flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs transition-colors",
                        active
                          ? "border-primary bg-primary font-semibold text-primary-foreground shadow-xs"
                          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <span className="font-semibold">{opt.label}</span>
                      <span
                        className={cn(
                          "whitespace-nowrap text-[10px]",
                          active ? "text-primary-foreground/80" : "text-muted-foreground",
                        )}
                      >
                        {opt.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={label}>Người giao việc</span>
              <p className="text-sm font-medium text-foreground">{group.assigned_by_name || "—"}</p>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder="Ghi chú người giao (tùy chọn)"
                className={field}
              />
            </div>
          </aside>
        </div>

        <footer className="shrink-0 space-y-2 border-t border-border/70 px-5 py-3">
          {err && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {group.status !== "done" && (
              <button
                type="button"
                onClick={() => onRemove(group)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 aria-hidden className="h-3.5 w-3.5" />
                Xóa nhiệm vụ
              </button>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {pending.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => onApprove(group)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <Check aria-hidden className="h-3.5 w-3.5" />
                    Duyệt hoàn thành (+{pendingPoints}đ)
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestRevision(group)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                    Yêu cầu làm lại
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  <Save aria-hidden className="h-4 w-4" />
                )}
                {busy ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}
