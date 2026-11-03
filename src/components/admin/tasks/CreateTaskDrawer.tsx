import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Loader2, Plus, Search, UserPlus, X } from "lucide-react";
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
import { initials, type TaskMember } from "./shared";

interface CreateTaskDrawerProps {
  members: TaskMember[];
  meLabel: string;
  onClose: () => void;
  onCreated: () => void;
}

const field =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";
const label = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

const POINT_PRESETS = [
  { value: 5, hint: "Việc nhỏ" },
  { value: 15, hint: "Việc vừa" },
  { value: 30, hint: "Dự án lớn" },
];

export function CreateTaskDrawer({ members, meLabel, onClose, onCreated }: CreateTaskDrawerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [due, setDue] = useState("");
  const [points, setPoints] = useState(10);
  const [note, setNote] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dept, setDept] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Auto-grow the description box up to a comfortable maximum.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [description]);

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
  const assignee = members.find((m) => m.id === assigneeId) ?? null;

  const create = async () => {
    setErr("");
    if (title.trim().length < 3) return setErr("Tên nhiệm vụ tối thiểu 3 ký tự.");
    if (!assigneeId) return setErr("Vui lòng chọn 1 người thực hiện.");
    setBusy(true);
    const { error } = await supabase.rpc("create_task_v2", {
      _title: title.trim(),
      _description: description.trim().slice(0, 3000),
      _assignee: assigneeId,
      _priority: priority,
      _due_on: (due || null) as unknown as string,
      _points: points,
      _assigned_note: note.trim(),
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    toast.success(`Đã giao nhiệm vụ cho ${assignee?.full_name ?? "thành viên"}`);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Giao nhiệm vụ mới"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-full w-full max-w-[560px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border/70 px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <UserPlus className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">Giao nhiệm vụ mới</h2>
            <p className="text-[11px] text-muted-foreground">
              Mỗi nhiệm vụ có một người chịu trách nhiệm chính duy nhất.
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <label className="block space-y-1.5">
            <span className={label}>Tiêu đề nhiệm vụ *</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="VD: Viết bài recap sự kiện Trung Thu"
              className={field}
            />
          </label>

          <section className="space-y-2 rounded-xl border border-border p-3">
            <span className={label}>Người phụ trách *</span>

            {assignee ? (
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {initials(assignee.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {assignee.full_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-mono">{assignee.member_code}</span> ·{" "}
                    {deptName(assignee.department)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssigneeId(null)}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:bg-accent"
                >
                  Đổi người
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
                  <Select
                    value={dept || "all"}
                    onValueChange={(v) => setDept(v === "all" ? "" : v)}
                  >
                    <SelectTrigger
                      aria-label="Lọc Ban"
                      className="h-9 rounded-lg border-input text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
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
                      className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
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

                <div className="max-h-52 overflow-y-auto rounded-lg border border-border">
                  {pool.length === 0 && (
                    <p className="p-3 text-xs text-muted-foreground">
                      Không có thành viên phù hợp.
                    </p>
                  )}
                  {pool.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAssigneeId(m.id)}
                      className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-xs transition-colors last:border-0 hover:bg-accent/60"
                    >
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {initials(m.full_name)}
                      </span>
                      <span className="font-medium text-foreground">{m.full_name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {m.member_code}
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {deptName(m.department)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <p className={label}>Người giao nhiệm vụ</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {meLabel || "Tài khoản đang đăng nhập"}{" "}
              <span className="text-[11px] font-normal text-muted-foreground">(tự động)</span>
            </p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Ghi chú người giao (tùy chọn), vd: Giao theo chỉ đạo của Ban Điều Hành"
              className={`${field} mt-2`}
            />
          </div>

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

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <span className={label}>Ưu tiên</span>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger
                  aria-label="Mức độ ưu tiên"
                  className="h-9 rounded-lg border-input text-xs"
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

            <label className="space-y-1.5">
              <span className={label}>Điểm thưởng</span>
              <input
                type="number"
                min={0}
                max={100}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className={field}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {POINT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setPoints(preset.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  points === preset.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {preset.value} điểm · {preset.hint}
              </button>
            ))}
          </div>

          {err && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border/70 px-5 py-3">
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
            onClick={create}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {busy ? "Đang giao…" : "Giao nhiệm vụ"}
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
