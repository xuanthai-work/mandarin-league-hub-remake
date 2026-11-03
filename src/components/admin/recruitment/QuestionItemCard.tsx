import { useState } from "react";
import { Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import { QUESTION_KINDS, canonicalKind } from "@/lib/recruitment";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  isChoiceKind,
  SELECT_CONTENT,
  SELECT_TRIGGER,
  type Confirm,
  type Run,
  type StudioQuestion,
} from "./types";

const iconBtn =
  "grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

/** One editable question: prompt, kind, required flag, visibility/delete actions and option tags. */
export function QuestionItemCard({
  question,
  index,
  run,
  confirm,
}: {
  question: StudioQuestion;
  index: number;
  run: Run;
  confirm: Confirm;
}) {
  const [draft, setDraft] = useState("");
  const kind = canonicalKind(question.kind);
  const choice = isChoiceKind(question.kind);

  const save = (
    patch: Partial<Pick<StudioQuestion, "prompt" | "kind" | "options" | "required" | "visible">>,
    ok?: string,
  ) => run(supabase.from("recruitment_questions").update(patch).eq("id", question.id), ok);

  const saveOptions = (options: string[]) => save({ options }, "Đã cập nhật lựa chọn.");

  const addOption = () => {
    const value = draft.trim();
    if (!value) return;
    setDraft("");
    if (question.options.includes(value)) return;
    saveOptions([...question.options, value]);
  };

  return (
    <div
      className={`rounded-xl border border-border bg-card p-3 transition-opacity ${
        question.visible ? "" : "opacity-60"
      }`}
    >
      <div className="flex flex-wrap items-start gap-2">
        <span className="mt-2 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-secondary text-[11px] font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <input
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          defaultValue={question.prompt}
          aria-label="Nội dung câu hỏi"
          placeholder="Nội dung câu hỏi"
          onBlur={(e) => {
            const prompt = e.target.value.trim();
            if (prompt && prompt !== question.prompt) void save({ prompt });
          }}
        />
        <Select value={kind} onValueChange={(next) => void save({ kind: next })}>
          <SelectTrigger
            aria-label="Loại câu hỏi"
            className="h-9 w-[150px] rounded-lg border-input bg-background text-xs font-medium shadow-none"
          >
            <SelectValue>{QUESTION_KINDS[kind]}</SelectValue>
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT}>
            {Object.entries(QUESTION_KINDS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground">
          <Switch
            checked={question.required}
            onCheckedChange={(required) => void save({ required })}
            aria-label="Bắt buộc trả lời"
          />
          Bắt buộc
        </label>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className={iconBtn}
            aria-label={question.visible ? "Ẩn câu hỏi" : "Hiện câu hỏi"}
            onClick={() => void save({ visible: !question.visible })}
          >
            {question.visible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            className={`${iconBtn} hover:bg-destructive/10 hover:text-destructive`}
            aria-label="Xóa câu hỏi"
            onClick={async () => {
              if (
                !(await confirm({
                  title: "Xóa câu hỏi?",
                  description: "Câu hỏi này sẽ bị xóa khỏi chủ đề và không thể khôi phục.",
                  confirmLabel: "Xóa câu hỏi",
                  destructive: true,
                }))
              )
                return;
              void run(supabase.from("recruitment_questions").delete().eq("id", question.id));
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {choice && (
        <div className="mt-2.5 space-y-2 rounded-lg bg-secondary/60 p-2.5">
          {question.options.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {question.options.map((option) => (
                <span
                  key={option}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background py-0.5 pl-2.5 pr-1 text-xs text-foreground"
                >
                  {option}
                  <button
                    type="button"
                    aria-label={`Xóa lựa chọn ${option}`}
                    className="grid h-4 w-4 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => saveOptions(question.options.filter((o) => o !== option))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <input
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
              placeholder="Nhập lựa chọn rồi nhấn Enter…"
              value={draft}
              aria-label="Thêm lựa chọn"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                addOption();
              }}
            />
            <button
              type="button"
              onClick={addOption}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              <Plus className="h-3 w-3" />
              Thêm
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Mục “Khác” luôn có sẵn khi ứng viên trả lời, không cần thêm vào danh sách.
          </p>
          {question.options.length > 0 && (
            <div className="space-y-1 rounded-lg border border-dashed border-border p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Xem trước · {kind === "multi" ? "chọn nhiều" : "chọn một"}
              </p>
              {question.options.slice(0, 3).map((option) => (
                <span
                  key={option}
                  className="flex items-center justify-between gap-1.5 rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground"
                >
                  {option}
                  <span
                    aria-hidden
                    className={`h-3 w-3 shrink-0 border border-muted-foreground/30 ${
                      kind === "multi" ? "rounded-[3px]" : "rounded-full"
                    }`}
                  />
                </span>
              ))}
              {question.options.length > 3 && (
                <p className="text-[11px] text-muted-foreground">
                  …và {question.options.length - 3} lựa chọn khác
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
