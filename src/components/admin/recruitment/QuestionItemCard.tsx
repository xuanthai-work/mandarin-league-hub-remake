import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import { Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { QUESTION_KINDS, canonicalKind } from "@/lib/recruitment";
import { parsePastedOptions } from "@/lib/recruitment-choice";
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

/** Browsers with `field-sizing: content` grow the prompt box on their own. */
const FIELD_SIZING =
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("field-sizing", "content");

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
  const [checking, setChecking] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const kind = canonicalKind(question.kind);
  const choice = isChoiceKind(question.kind);

  // Keep the prompt box exactly as tall as its wrapped text: CSS `field-sizing`
  // grows it natively, and the JS pass covers browsers without that support.
  const growPrompt = () => {
    if (FIELD_SIZING) return;
    const el = promptRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => {
    const id = requestAnimationFrame(growPrompt);
    return () => cancelAnimationFrame(id);
  }, [question.prompt]);

  const save = (
    patch: Partial<Pick<StudioQuestion, "prompt" | "kind" | "options" | "required" | "visible">>,
    ok?: string,
  ) => run(supabase.from("recruitment_questions").update(patch).eq("id", question.id), ok);

  const saveOptions = (options: string[]) => save({ options }, "Đã cập nhật lựa chọn.");

  /** Appends whatever survived parsing, so a pasted block costs a single update. */
  const addOptionsList = (newOptions: string[]) => {
    if (newOptions.length === 0) return;
    saveOptions([...question.options, ...newOptions]);
  };

  const addOption = () => {
    if (!draft.trim()) return;
    setDraft("");
    addOptionsList(parsePastedOptions(draft, question.options));
  };

  /** A multi-line paste becomes one option per line instead of a single long label. */
  const pasteOptions = (e: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText.includes("\n") && !pastedText.includes("\r")) return;
    e.preventDefault();
    setDraft("");
    addOptionsList(parsePastedOptions(pastedText, question.options));
  };

  /** Answered questions are only hidden, so existing applications keep their question text. */
  const remove = async () => {
    setChecking(true);
    const { data: answered, error } = await supabase.rpc("recruitment_answer_count", {
      _question: question.id,
    });
    setChecking(false);
    if (error) {
      toast.error("Chưa kiểm tra được câu trả lời của ứng viên: " + error.message);
      return;
    }
    if ((answered ?? 0) > 0) {
      const hide = await confirm({
        title: "Không thể xóa câu hỏi này",
        description: question.visible
          ? `${answered} ứng viên đã trả lời câu hỏi này. Xóa sẽ làm hồ sơ của họ mất nội dung câu hỏi. Hãy ẩn câu hỏi để ứng viên mới không thấy nữa.`
          : `${answered} ứng viên đã trả lời câu hỏi này nên không thể xóa. Câu hỏi đang được ẩn, ứng viên mới đã không thấy.`,
        confirmLabel: question.visible ? "Ẩn câu hỏi" : "Đã hiểu",
      });
      if (hide && question.visible) void save({ visible: false }, "Đã ẩn câu hỏi.");
      return;
    }
    const ok = await confirm({
      title: "Xóa câu hỏi?",
      description:
        "Chưa có ứng viên nào trả lời câu hỏi này. Câu hỏi sẽ bị xóa và không thể khôi phục.",
      confirmLabel: "Xóa câu hỏi",
      destructive: true,
    });
    if (!ok) return;
    void run(
      supabase.from("recruitment_questions").delete().eq("id", question.id),
      "Đã xóa câu hỏi.",
    );
  };

  return (
    <div
      className={`rounded-xl border border-border bg-card p-3 transition-opacity ${
        question.visible ? "" : "opacity-60"
      }`}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-secondary text-[11px] font-semibold text-muted-foreground">
            {index + 1}
          </span>
          <textarea
            ref={promptRef}
            rows={1}
            className="field-sizing-content min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-input bg-background px-3 py-1.5 text-sm leading-snug"
            defaultValue={question.prompt}
            aria-label="Nội dung câu hỏi"
            placeholder="Nội dung câu hỏi"
            onInput={growPrompt}
            onKeyDown={(e) => {
              // Enter adds a line, so save with Cmd/Ctrl+Enter instead.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            onBlur={(e) => {
              const prompt = e.target.value.trim();
              if (prompt && prompt !== question.prompt) void save({ prompt });
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pl-8 md:justify-end md:pl-0">
          <div className="flex items-center gap-2">
            <Select value={kind} onValueChange={(next) => void save({ kind: next })}>
              <SelectTrigger
                aria-label="Loại câu hỏi"
                className="h-9 w-[130px] rounded-lg border-input bg-background text-xs font-normal shadow-none sm:w-[150px]"
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

            <label className="flex h-9 cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Switch
                checked={question.required}
                onCheckedChange={(required) => void save({ required })}
                aria-label="Bắt buộc trả lời"
              />
              Bắt buộc
            </label>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
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
              disabled={checking}
              onClick={() => void remove()}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
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
              placeholder="Nhập lựa chọn rồi nhấn Enter… (hoặc dán danh sách nhiều dòng)"
              value={draft}
              aria-label="Thêm lựa chọn"
              onChange={(e) => setDraft(e.target.value)}
              onPaste={pasteOptions}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                addOption();
              }}
            />
            <button
              type="button"
              onClick={addOption}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              <Plus className="h-3 w-3" />
              Thêm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
