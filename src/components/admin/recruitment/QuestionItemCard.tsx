import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import { Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { QUESTION_KINDS, canonicalKind } from "@/lib/recruitment";
import { parsePastedOptions } from "@/lib/recruitment-choice";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { isChoiceKind, SELECT_CONTENT, type Confirm, type Run, type StudioQuestion } from "./types";

/** Browsers with `field-sizing: content` grow the prompt box on their own. */
const FIELD_SIZING =
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("field-sizing", "content");

/** One editable question: prompt, kind, required flag, visibility/delete actions and option tags. */
export function QuestionItemCard({
  question,
  index,
  readOnly = false,
  run,
  confirm,
}: {
  question: StudioQuestion;
  index: number;
  readOnly?: boolean;
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
  ) => {
    if (readOnly) return Promise.resolve(false);
    return run(supabase.from("recruitment_questions").update(patch).eq("id", question.id), ok);
  };

  const saveOptions = (options: string[]) => {
    if (readOnly) return;
    void save({ options }, "Đã cập nhật lựa chọn.");
  };

  /** Appends whatever survived parsing, so a pasted block costs a single update. */
  const addOptionsList = (newOptions: string[]) => {
    if (readOnly) return;
    if (newOptions.length === 0) return;
    saveOptions([...question.options, ...newOptions]);
  };

  const addOption = () => {
    if (readOnly) return;
    if (!draft.trim()) return;
    setDraft("");
    addOptionsList(parsePastedOptions(draft, question.options));
  };

  /** A multi-line paste becomes one option per line instead of a single long label. */
  const pasteOptions = (e: ClipboardEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText.includes("\n") && !pastedText.includes("\r")) return;
    e.preventDefault();
    setDraft("");
    addOptionsList(parsePastedOptions(pastedText, question.options));
  };

  /** Answered questions are only hidden, so existing applications keep their question text. */
  const remove = async () => {
    if (readOnly) return;
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
          <AdminTextarea
            ref={promptRef}
            rows={1}
            className="field-sizing-content min-h-0 min-w-0 flex-1 resize-none overflow-hidden px-3 py-1.5 leading-snug"
            defaultValue={question.prompt}
            aria-label="Nội dung câu hỏi"
            placeholder="Nội dung câu hỏi"
            readOnly={readOnly}
            onInput={growPrompt}
            onKeyDown={(e) => {
              if (readOnly) return;
              // Enter adds a line, so save with Cmd/Ctrl+Enter instead.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            onBlur={(e) => {
              if (readOnly) return;
              const prompt = e.target.value.trim();
              if (prompt && prompt !== question.prompt) void save({ prompt });
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pl-8 md:justify-end md:pl-0">
          <div className="flex items-center gap-2">
            <Select
              value={kind}
              disabled={readOnly}
              onValueChange={(next) => void save({ kind: next })}
            >
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

            <label
              className={`flex h-9 select-none items-center gap-1.5 text-xs font-medium text-muted-foreground ${
                readOnly ? "cursor-default" : "cursor-pointer"
              }`}
            >
              <Switch
                checked={question.required}
                disabled={readOnly}
                onCheckedChange={(required) => void save({ required })}
                aria-label="Bắt buộc trả lời"
              />
              Bắt buộc
            </label>
          </div>

          {!readOnly && (
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="admin-icon"
                className="h-7 w-7 text-muted-foreground [&_svg]:size-3.5"
                aria-label={question.visible ? "Ẩn câu hỏi" : "Hiện câu hỏi"}
                onClick={() => void save({ visible: !question.visible })}
              >
                {question.visible ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="admin-icon"
                className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Xóa câu hỏi"
                disabled={checking}
                onClick={() => void remove()}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          )}
        </div>
      </div>

      {choice && (question.options.length > 0 || !readOnly) && (
        <div className="mt-2.5 space-y-2 rounded-lg bg-secondary/60 p-2.5">
          {question.options.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {question.options.map((option) => (
                <span
                  key={option}
                  className={`inline-flex items-center gap-1 rounded-full border border-border bg-background py-0.5 text-xs text-foreground ${
                    readOnly ? "px-2.5" : "pl-2.5 pr-1"
                  }`}
                >
                  {option}
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Xóa lựa chọn ${option}`}
                      onClick={() => saveOptions(question.options.filter((o) => o !== option))}
                      className="h-4 w-4 rounded-full p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive [&_svg]:size-3"
                    >
                      <X aria-hidden />
                    </Button>
                  )}
                </span>
              ))}
            </div>
          )}
          {!readOnly && (
            <div className="flex gap-1.5">
              <AdminInput
                className="h-8 min-w-0 flex-1 text-xs"
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
              <Button
                type="button"
                variant="outline"
                size="admin-sm"
                onClick={addOption}
                className="shrink-0 [&_svg]:size-3"
              >
                <Plus aria-hidden /> Thêm
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
