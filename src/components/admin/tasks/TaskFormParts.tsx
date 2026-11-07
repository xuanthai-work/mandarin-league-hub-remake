import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ExternalLink, FileText, Paperclip, X } from "lucide-react";

import { AdminInput } from "@/components/admin/kit/AdminInput";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY } from "@/lib/points";
import { cn } from "@/lib/utils";
import { PRIORITY_DOT, shortUrl, type TaskAttachment } from "./shared";

/** Shared form pieces of the create and detail task modals. */

export type TaskPriority = "low" | "medium" | "high";

export const toTaskPriority = (value: string): TaskPriority =>
  value === "high" || value === "low" ? value : "medium";

export const POINT_OPTIONS = [
  { value: 5, label: "5đ", hint: "Việc nhỏ" },
  { value: 10, label: "10đ", hint: "Việc vừa" },
  { value: 20, label: "20đ", hint: "Dự án lớn" },
] as const;

/** Group heading (not tied to one input), e.g. "Người phụ trách", "Điểm thưởng cống hiến". */
export const TASK_LABEL = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

/** Grow a textarea to fit its content, up to a comfortable maximum. */
export function useAutoGrow(value: string, max = 260) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [value, max]);
  return ref;
}

export function TaskPrioritySelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(toTaskPriority(v))} disabled={disabled}>
      <SelectTrigger
        {...(id ? { id } : {})}
        className="h-9 rounded-xl border-input text-xs font-normal"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        {(["high", "medium", "low"] as const).map((p) => (
          <SelectItem key={p} value={p} className="text-xs">
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[p]}`} />
              <span>{PRIORITY[p]}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TaskPointPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label="Điểm thưởng cống hiến" className="grid grid-cols-3 gap-1.5">
      {POINT_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            size="admin"
            variant={active ? "default" : "outline"}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className="gap-1.5 px-2"
          >
            <span className="font-semibold">{opt.label}</span>
            <span
              className={cn(
                "whitespace-nowrap text-[10px] font-normal",
                active ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              {opt.hint}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

const newDocId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `doc-${Date.now()}`;

/** Linked documents of a task: list with open/remove, plus an inline "add URL" form. */
export function TaskAttachmentsEditor({
  attachments,
  onChange,
  readOnly,
}: {
  attachments: TaskAttachment[];
  onChange: (next: TaskAttachment[]) => void;
  readOnly?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docErr, setDocErr] = useState("");

  const reset = () => {
    setAdding(false);
    setDocTitle("");
    setDocUrl("");
    setDocErr("");
  };

  const add = () => {
    const url = docUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setDocErr("URL phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    onChange([...attachments, { id: newDocId(), title: docTitle.trim() || shortUrl(url), url }]);
    reset();
  };

  const addOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  };

  if (readOnly && attachments.length === 0) return null;

  return (
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
                <p className="truncate text-[10px] text-muted-foreground">{shortUrl(doc.url)}</p>
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
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="admin-icon"
                  onClick={() => onChange(attachments.filter((item) => item.id !== doc.id))}
                  aria-label={`Gỡ tài liệu ${doc.title}`}
                  title="Gỡ tài liệu"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive [&_svg]:size-3.5"
                >
                  <X aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!readOnly &&
        (adding ? (
          <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-2.5">
            <AdminInput
              autoFocus
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              onKeyDown={addOnEnter}
              aria-label="URL tài liệu"
              placeholder="https://drive.google.com/…, https://docs.google.com/…"
              className="text-xs"
            />
            <AdminInput
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              onKeyDown={addOnEnter}
              aria-label="Tên tài liệu"
              maxLength={120}
              placeholder="Tên tài liệu (tùy chọn): Brief chiến dịch, File mẫu thiết kế…"
              className="text-xs"
            />
            {docErr && (
              <p role="alert" className="text-[11px] text-destructive">
                {docErr}
              </p>
            )}
            <div className="flex items-center gap-1.5">
              <Button type="button" size="admin-sm" onClick={add}>
                Thêm
              </Button>
              <Button type="button" variant="outline" size="admin-sm" onClick={reset}>
                Hủy
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="link"
            onClick={() => setAdding(true)}
            className="h-auto gap-1 p-0 text-xs font-normal text-muted-foreground underline underline-offset-2 hover:text-foreground [&_svg]:size-3.5"
          >
            <Paperclip aria-hidden />
            Thêm tài liệu liên quan
          </Button>
        ))}
    </section>
  );
}
