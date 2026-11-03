import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { PRIORITY } from "@/lib/points";
import { deptName } from "@/lib/recruitment";
import { cn } from "@/lib/utils";
import {
  PRIORITY_TONE,
  deptTone,
  initials,
  serializeDescription,
  shortUrl,
  type TaskAttachment,
  type TaskMember,
} from "./shared";

interface TaskCreateModalProps {
  members: TaskMember[];
  meLabel: string;
  onClose: () => void;
  onCreated: () => void;
}

type Priority = "low" | "medium" | "high";

const field =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20";
const label = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
/** Selects must float above the z-[70] dialog (their default content layer is z-50). */
const SELECT_CONTENT = "z-[95] rounded-xl";

const PRIORITIES: Priority[] = ["low", "medium", "high"];

const POINT_OPTIONS = [
  { value: 5, label: "5đ", hint: "Việc nhỏ" },
  { value: 10, label: "10đ", hint: "Việc vừa" },
  { value: 20, label: "20đ", hint: "Dự án lớn" },
];

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

export function TaskCreateModal({
  members,
  meLabel,
  onClose,
  onCreated,
}: TaskCreateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState("");
  const [points, setPoints] = useState(10);
  const [note, setNote] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dept, setDept] = useState("");
  const [q, setQ] = useState("");
  const [addingDoc, setAddingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docErr, setDocErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const textRef = useAutoGrow(description);

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

  const depts = useMemo(
    () => [...new Set(members.map((m) => m.department).filter(Boolean))],
    [members],
  );
  const term = q.trim().toLowerCase();
  const pool = members.filter(
    (m) =>
      (!dept || m.department === dept) &&
      (!term ||
        m.full_name.toLowerCase().includes(term) ||
        m.member_code.toLowerCase().includes(term)),
  );
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const selectedMembers = useMemo(
    () =>
      assigneeIds
        .map((id) => memberById.get(id))
        .filter((m): m is TaskMember => Boolean(m)),
    [assigneeIds, memberById],
  );

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const selectAllInPool = () =>
    setAssigneeIds((prev) => [...new Set([...prev, ...pool.map((m) => m.id)])]);

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

  const create = async () => {
    setErr("");
    if (title.trim().length < 3) return setErr("Tên nhiệm vụ tối thiểu 3 ký tự.");
    if (assigneeIds.length === 0) return setErr("Vui lòng chọn ít nhất 1 người thực hiện.");
    const stored = serializeDescription(description, attachments);
    if (stored.length > 3000) {
      setErr("Mô tả và tài liệu vượt quá 3.000 ký tự, vui lòng rút gọn.");
      return;
    }
    setBusy(true);
    // One row per member: each assignee reports evidence and earns points independently.
    const results = await Promise.all(
      assigneeIds.map((id) =>
        supabase.rpc("create_task_v2", {
          _title: title.trim(),
          _description: stored,
          _assignee: id,
          _priority: priority,
          _due_on: (due || null) as unknown as string,
          _points: points,
          _assigned_note: note.trim(),
        }),
      ),
    );
    setBusy(false);
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      setErr(failed.error.message);
      // Keep the rows that did get created visible instead of silently letting a retry duplicate them.
      if (results.some((result) => !result.error)) onCreated();
      return;
    }
    toast.success(
      selectedMembers.length === 1
        ? `Đã giao nhiệm vụ cho ${selectedMembers[0]!.full_name}`
        : `Đã giao nhiệm vụ cho ${selectedMembers.length} thành viên`,
    );
    onCreated();
    onClose();
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
        aria-label="Giao nhiệm vụ mới"
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl lg:max-w-5xl xl:max-w-6xl"
      >
        <header className="flex shrink-0 items-start gap-2 border-b border-border/70 px-5 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <UserPlus aria-hidden className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">Giao nhiệm vụ mới</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Giao việc cho thành viên, thiết lập hạn chót, mức điểm và đính kèm tài liệu.
            </p>
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
              <span className={label}>Tiêu đề nhiệm vụ *</span>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="VD: Viết bài recap sự kiện Trung Thu"
                className="w-full rounded-xl border border-transparent bg-transparent px-1 py-1 text-lg font-bold leading-snug text-foreground transition-colors placeholder:font-medium placeholder:text-muted-foreground hover:border-border focus:border-input focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

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

          {/* Right: assignment & attributes */}
          <aside className="space-y-4 lg:col-span-5 lg:border-l lg:border-border/70 lg:pl-6">
            <div className="space-y-2">
              <span className={label}>
                Người phụ trách *
                {assigneeIds.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-primary">
                    Đã chọn {assigneeIds.length} người thực hiện
                  </span>
                )}
              </span>

              {selectedMembers.length > 0 && (
                <ul className="custom-scrollbar max-h-44 space-y-1 overflow-y-auto rounded-xl border border-primary/25 bg-primary/5 p-1.5">
                  {selectedMembers.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-2 rounded-lg bg-card px-2 py-1.5"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {initials(m.full_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {m.full_name}
                        </p>
                        <p className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                          <span className="font-mono">{m.member_code}</span>
                          <span className="text-border">·</span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 font-semibold",
                              deptTone(m.department).tag,
                            )}
                          >
                            {deptName(m.department)}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleAssignee(m.id)}
                        aria-label={`Bỏ chọn ${m.full_name}`}
                        title="Bỏ chọn"
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                <Select
                  value={dept || "all"}
                  onValueChange={(v) => setDept(v === "all" ? "" : v)}
                >
                  <SelectTrigger
                    aria-label="Lọc Ban"
                    className="h-9 rounded-xl border-input text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    <SelectItem value="all" className="text-xs">
                      Tất cả các Ban
                    </SelectItem>
                    {depts.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {deptName(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Tìm tên hoặc mã thành viên…"
                    className="w-full rounded-xl border border-input bg-background py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {q && (
                    <button
                      type="button"
                      onClick={() => setQ("")}
                      aria-label="Xóa nội dung tìm kiếm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground">{pool.length} thành viên phù hợp</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllInPool}
                    disabled={pool.length === 0}
                    className="font-medium text-primary underline underline-offset-2 disabled:opacity-50"
                  >
                    Chọn tất cả ({pool.length})
                  </button>
                  {assigneeIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAssigneeIds([])}
                      className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>
              </div>

              <div className="custom-scrollbar max-h-52 overflow-y-auto rounded-xl border border-border">
                {pool.length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground">
                    Không có thành viên phù hợp.
                  </p>
                )}
                {pool.map((m) => {
                  const checked = assigneeIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAssignee(m.id)}
                      aria-pressed={checked}
                      className={cn(
                        "flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-xs transition-colors last:border-0",
                        checked ? "bg-primary/10" : "hover:bg-accent/60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-4 w-4 shrink-0 place-items-center rounded border",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-transparent",
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {initials(m.full_name)}
                      </span>
                      <span className="truncate font-medium text-foreground">{m.full_name}</span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {m.member_code}
                      </span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        {deptName(m.department)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={label}>Mức độ ưu tiên</span>
              <div className="grid grid-cols-3 gap-1.5">
                {PRIORITIES.map((p) => {
                  const active = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-xl border px-2 py-2 text-xs font-semibold transition-colors",
                        active
                          ? cn("border-transparent", PRIORITY_TONE[p] ?? "bg-primary/10 text-primary")
                          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {PRIORITY[p] ?? p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={label}>Điểm thưởng cống hiến</span>
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
                        "flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2 text-xs transition-colors",
                        active
                          ? "border-primary bg-primary font-semibold text-primary-foreground shadow-xs"
                          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <span className="font-semibold">{opt.label}</span>
                      <span
                        className={cn(
                          "text-[10px]",
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
              <span className={label}>Hạn chót</span>
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <DatePicker value={due} onChange={setDue} placeholder="Chọn hạn" />
                </div>
                {due && (
                  <button
                    type="button"
                    onClick={() => setDue("")}
                    aria-label="Gỡ hạn chót"
                    title="Gỡ hạn chót"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X aria-hidden className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={label}>Người giao việc</span>
              <p className="text-sm font-medium text-foreground">
                {meLabel || "Tài khoản đang đăng nhập"}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">(tự động)</span>
              </p>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder="Ghi chú người giao (tùy chọn), vd: Giao theo chỉ đạo của Ban Điều Hành"
                className={field}
              />
            </div>
          </aside>
        </div>

        <footer className="sticky bottom-0 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border/70 bg-card/90 px-5 py-3.5 backdrop-blur-xs">
          {err && (
            <p className="mr-auto rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {err}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void create()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {busy
              ? "Đang giao…"
              : assigneeIds.length > 1
                ? `Giao cho ${assigneeIds.length} người`
                : "Giao nhiệm vụ"}
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
