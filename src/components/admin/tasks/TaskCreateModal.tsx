import { useMemo, useState } from "react";
import { Check, Loader2, Plus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
import { AdminModal } from "@/components/admin/kit/AdminModal";
import { FormField } from "@/components/admin/kit/FormField";
import { MemberAvatar } from "@/components/admin/kit/MemberAvatar";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { deptName } from "@/lib/recruitment";
import { cn } from "@/lib/utils";
import {
  TASK_LABEL,
  TaskAttachmentsEditor,
  TaskPointPicker,
  TaskPrioritySelect,
  type TaskPriority,
  useAutoGrow,
} from "./TaskFormParts";
import { serializeDescription, type TaskAttachment, type TaskMember } from "./shared";

interface TaskCreateModalProps {
  members: TaskMember[];
  /** `avatar_path → signed URL` for the assignee picker. */
  avatarMap?: Map<string, string> | undefined;
  meLabel: string;
  onClose: () => void;
  onCreated: () => void;
}

/** Selects must float above the z-[70] dialog (their default content layer is z-50). */
const SELECT_CONTENT = "z-[95] rounded-xl";

export function TaskCreateModal({
  members,
  avatarMap,
  meLabel,
  onClose,
  onCreated,
}: TaskCreateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [due, setDue] = useState("");
  const [points, setPoints] = useState(10);
  const [note, setNote] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dept, setDept] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const textRef = useAutoGrow(description);

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
    () => assigneeIds.map((id) => memberById.get(id)).filter((m): m is TaskMember => Boolean(m)),
    [assigneeIds, memberById],
  );

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const isAllInPoolSelected = pool.length > 0 && pool.every((m) => assigneeIds.includes(m.id));
  const toggleSelectAllPool = () => {
    if (pool.length === 0) return;
    if (isAllInPoolSelected) {
      const poolIds = new Set(pool.map((m) => m.id));
      setAssigneeIds((prev) => prev.filter((id) => !poolIds.has(id)));
    } else {
      setAssigneeIds((prev) => [...new Set([...prev, ...pool.map((m) => m.id)])]);
    }
  };

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
    <AdminModal
      size="xl"
      icon={UserPlus}
      title="Giao nhiệm vụ mới"
      description="Giao việc cho thành viên, thiết lập hạn chót, mức điểm và đính kèm tài liệu."
      onClose={onClose}
      dismissible={!busy}
      bodyClassName="grid gap-6 lg:grid-cols-12"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          {err && (
            <p className="mr-auto rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {err}
            </p>
          )}
          <Button type="button" size="admin-lg" onClick={() => void create()} disabled={busy}>
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : <Plus aria-hidden />}
            {busy
              ? "Đang giao…"
              : assigneeIds.length > 1
                ? `Giao cho ${assigneeIds.length} người`
                : "Giao nhiệm vụ"}
          </Button>
        </div>
      }
    >
      {/* Left: the work itself */}
      <div className="min-w-0 space-y-4 lg:col-span-7">
        <FormField label="Tiêu đề nhiệm vụ" required>
          {(f) => (
            <AdminInput
              {...f}
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="VD: Viết bài recap sự kiện Trung Thu"
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
                maxLength={3000}
                rows={3}
                placeholder="Mô tả kết quả cần đạt, minh chứng cần nộp…"
                className="resize-none text-xs leading-relaxed"
              />
            )}
          </FormField>
          <TaskAttachmentsEditor attachments={attachments} onChange={setAttachments} />
        </div>
      </div>

      {/* Right: assignment & attributes */}
      <aside className="space-y-4 lg:col-span-5 lg:border-l lg:border-border/70 lg:pl-6">
        <div className="space-y-2">
          <span className={TASK_LABEL}>
            Người phụ trách *
            {assigneeIds.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-primary">
                Đã chọn {assigneeIds.length} người thực hiện
              </span>
            )}
          </span>

          <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
            <Select value={dept || "all"} onValueChange={(v) => setDept(v === "all" ? "" : v)}>
              <SelectTrigger aria-label="Lọc Ban" className="h-9 rounded-xl border-input text-xs">
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

            <SearchInput
              className="w-full"
              value={q}
              onChange={setQ}
              placeholder="Tìm tên hoặc mã thành viên…"
              label="Tìm thành viên"
            />
          </div>

          {pool.length > 0 && (
            <div className="flex justify-end text-[11px]">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-[11px] font-medium underline underline-offset-2"
                onClick={toggleSelectAllPool}
              >
                {isAllInPoolSelected ? "Bỏ chọn tất cả" : `Chọn tất cả (${pool.length})`}
              </Button>
            </div>
          )}

          <div className="custom-scrollbar max-h-52 overflow-y-auto rounded-xl border border-border">
            {pool.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">Không có thành viên phù hợp.</p>
            )}
            {pool.map((m) => {
              const checked = assigneeIds.includes(m.id);
              return (
                <Button
                  key={m.id}
                  type="button"
                  variant="ghost"
                  onClick={() => toggleAssignee(m.id)}
                  aria-pressed={checked}
                  className={cn(
                    "h-auto w-full justify-start gap-2.5 rounded-none border-b border-border px-3 py-2 text-left text-xs font-normal last:border-0 [&_svg]:size-3",
                    checked ? "bg-primary/10 hover:bg-primary/10" : "hover:bg-accent/60",
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
                    <Check aria-hidden />
                  </span>
                  <MemberAvatar
                    src={m.avatar_path ? avatarMap?.get(m.avatar_path) : null}
                    name={m.full_name}
                    className="h-7 w-7 text-[10px]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{m.full_name}</p>
                    <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="font-mono">{m.member_code}</span>
                      <span className="text-border">·</span>
                      <span className="truncate">{deptName(m.department)}</span>
                    </p>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Mức độ ưu tiên">
            {(f) => <TaskPrioritySelect id={f.id} value={priority} onChange={setPriority} />}
          </FormField>

          <FormField label="Hạn chót">
            {(f) => (
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <DatePicker id={f.id} value={due} onChange={setDue} placeholder="Chọn hạn" />
                </div>
                {due && (
                  <Button
                    type="button"
                    variant="outline"
                    size="admin-icon"
                    className="shrink-0 text-muted-foreground [&_svg]:size-3.5"
                    onClick={() => setDue("")}
                    aria-label="Gỡ hạn chót"
                    title="Gỡ hạn chót"
                  >
                    <X aria-hidden />
                  </Button>
                )}
              </div>
            )}
          </FormField>
        </div>

        <div className="space-y-1.5">
          <span className={TASK_LABEL}>Điểm thưởng cống hiến</span>
          <TaskPointPicker value={points} onChange={setPoints} />
        </div>

        <div className="space-y-1.5">
          <span className={TASK_LABEL}>Người giao việc</span>
          <p className="text-sm font-medium text-foreground">
            {meLabel || "Tài khoản đang đăng nhập"}
          </p>
          <AdminInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            aria-label="Ghi chú người giao"
            placeholder="Ghi chú người giao (tùy chọn), vd: Giao theo chỉ đạo của Ban Điều Hành"
            className="text-xs"
          />
        </div>
      </aside>
    </AdminModal>
  );
}
