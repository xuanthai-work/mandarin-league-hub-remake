import { useEffect, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { canonicalKind, deptName, positionsFor } from "@/lib/recruitment";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChoiceAnswerList } from "@/components/recruitment/ChoiceAnswerList";
import { SELECT_CONTENT, SELECT_TRIGGER, type StudioQuestion, type StudioTopic } from "./types";

/**
 * Slide-over that renders the topic/question set exactly the way an applicant sees it,
 * so admins can sanity-check wording, option lists and required flags before publishing.
 */
export function CandidatePreviewDrawer({
  open,
  onClose,
  dept,
  topics,
  questions,
}: {
  open: boolean;
  onClose: () => void;
  /** Rail id: a department id, or `"common"` for the shared bucket. */
  dept: string;
  topics: StudioTopic[];
  questions: StudioQuestion[];
}) {
  const isCommon = dept === "common";
  const positions = isCommon ? [] : positionsFor(dept);
  const [position, setPosition] = useState(positions[0] ?? "");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // A fresh department starts on its default position with an empty form.
  useEffect(() => {
    setPosition(positions[0] ?? "");
    setAnswers({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept]);

  if (!open) return null;

  const applicable = topics.filter(
    (t) => t.visible && (t.position == null || t.position === position),
  );
  const setAnswer = (id: string, value: string | string[]) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-foreground/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Xem trước biểu mẫu dạng ứng viên"
    >
      <div
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Xem trước biểu mẫu
            </p>
            <h2 className="truncate text-lg font-bold text-foreground">
              {deptName(isCommon ? null : dept)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isCommon
                ? "Câu hỏi chung hiển thị cho mọi ứng viên."
                : "Chọn vị trí để xem đúng bộ câu hỏi ứng viên sẽ gặp."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng xem trước"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!isCommon && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Vị trí ứng tuyển</p>
              <Select
                value={position}
                onValueChange={(v) => {
                  setPosition(v);
                  setAnswers({});
                }}
              >
                <SelectTrigger aria-label="Vị trí ứng tuyển" className={`mt-1 ${SELECT_TRIGGER}`}>
                  <SelectValue>{position || "— Chọn vị trí —"}</SelectValue>
                </SelectTrigger>
                <SelectContent className={SELECT_CONTENT}>
                  {positions.map((p) => (
                    <SelectItem key={p} value={p} className="text-sm">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {applicable.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Vị trí này chưa có chủ đề nào hiển thị.
            </p>
          )}

          {applicable.map((topic) => (
            <section key={topic.id} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-primary-deep">{topic.title}</h3>
              {topic.description && (
                <p className="text-xs text-muted-foreground">{topic.description}</p>
              )}
              <div className="mt-3 space-y-3.5">
                {questions
                  .filter((q) => q.topic_id === topic.id && q.visible)
                  .map((q) => {
                    const value = answers[q.id];
                    const kind = canonicalKind(q.kind);
                    return (
                      <div key={q.id}>
                        <p className="text-sm font-medium text-foreground">
                          {q.prompt}
                          {q.required && <span className="ml-1 text-destructive">*</span>}
                        </p>
                        {kind === "long" && (
                          <textarea
                            rows={3}
                            className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                            placeholder="Nhập câu trả lời của bạn…"
                            value={(value as string) ?? ""}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                          />
                        )}
                        {(kind === "single" || kind === "multi") && (
                          <ChoiceAnswerList
                            multiple={kind === "multi"}
                            options={q.options}
                            value={value}
                            onChange={(next) => setAnswer(q.id, next)}
                            ariaLabel={q.prompt}
                          />
                        )}
                        {kind === "file" && (
                          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                            <Paperclip className="h-3.5 w-3.5" />
                            Ứng viên tải tệp lên tại đây
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>

        <footer className="border-t border-border bg-muted/40 p-4 text-[11px] text-muted-foreground">
          Đây chỉ là bản xem trước — không có dữ liệu nào được lưu.
        </footer>
      </div>
    </div>
  );
}
