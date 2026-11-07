import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Eye, Paperclip } from "lucide-react";
import { canonicalKind, deptName, parseTopicPositions, positionsFor } from "@/lib/recruitment";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AdminModal } from "@/components/admin/kit/AdminModal";
import { AdminTextarea } from "@/components/admin/kit/AdminInput";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { FormField } from "@/components/admin/kit/FormField";
import { ChoiceAnswerList } from "@/components/recruitment/ChoiceAnswerList";
import { SELECT_CONTENT, type StudioQuestion, type StudioTopic } from "./types";

/** What the simulated file picker stores for a question of kind `file`. */
type PreviewFile = { name: string; size: number };
type PreviewAnswer = string | string[] | PreviewFile;

const formatFileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Centred modal that renders the topic/question set exactly the way an applicant
 * sees it, so admins can sanity-check wording, option lists and required flags
 * before publishing.
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
  // Custom positions typed by admins have to be previewable too, so merge both sources.
  const positions = isCommon
    ? []
    : Array.from(
        new Set([...positionsFor(dept), ...topics.flatMap((t) => parseTopicPositions(t.position))]),
      );
  const [position, setPosition] = useState(positions[0] ?? "");
  const [answers, setAnswers] = useState<Record<string, PreviewAnswer>>({});

  // A fresh department starts on its default position with an empty form.
  useEffect(() => {
    setPosition(positions[0] ?? "");
    setAnswers({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept]);

  const applicable = topics.filter((t) => {
    if (!t.visible) return false;
    if (isCommon) return true;
    const targets = parseTopicPositions(t.position);
    return targets.length === 0 || (position ? targets.includes(position) : true);
  });
  const setAnswer = (id: string, value: PreviewAnswer) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  return (
    <AnimatePresence>
      {open && (
        <AdminModal
          size="lg"
          icon={Eye}
          title={`Xem trước biểu mẫu · ${deptName(isCommon ? null : dept)}`}
          description={
            isCommon
              ? "Câu hỏi chung hiển thị cho mọi ứng viên."
              : "Chọn vị trí để xem đúng bộ câu hỏi ứng viên sẽ gặp."
          }
          onClose={onClose}
          footer={
            <p className="text-[11px] text-muted-foreground">
              Đây chỉ là bản xem trước — không có dữ liệu nào được lưu.
            </p>
          }
        >
          {!isCommon && (
            <FormField label="Vị trí ứng tuyển">
              {(field) => (
                <Select
                  value={position}
                  onValueChange={(v) => {
                    setPosition(v);
                    setAnswers({});
                  }}
                >
                  <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
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
              )}
            </FormField>
          )}

          {applicable.length === 0 && (
            <EmptyState title="Vị trí này chưa có chủ đề nào hiển thị." />
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
                    // Answers can also hold the preview file object, so narrow before feeding choices.
                    const choiceValue =
                      typeof value === "string" || Array.isArray(value) ? value : undefined;
                    const fileValue =
                      value && typeof value === "object" && !Array.isArray(value) ? value : null;
                    return (
                      <div key={q.id}>
                        <p className="whitespace-pre-line text-sm font-medium text-foreground">
                          {q.prompt}
                          {q.required && <span className="ml-1 text-destructive">*</span>}
                        </p>
                        {kind === "long" && (
                          <AdminTextarea
                            rows={3}
                            className="mt-1.5"
                            placeholder="Nhập câu trả lời của bạn…"
                            value={(value as string) ?? ""}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                          />
                        )}
                        {(kind === "single" || kind === "multi") && (
                          <ChoiceAnswerList
                            multiple={kind === "multi"}
                            options={q.options}
                            value={choiceValue}
                            onChange={(next) => setAnswer(q.id, next)}
                            ariaLabel={q.prompt}
                          />
                        )}
                        {kind === "file" && (
                          <div className="mt-1.5">
                            {fileValue ? (
                              <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-foreground">
                                      {fileValue.name}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {formatFileSize(fileValue.size)}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                                    Đã chọn tệp (Xem trước)
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="admin-sm"
                                  onClick={() => setAnswer(q.id, "")}
                                  className="ml-2 shrink-0 font-normal text-muted-foreground hover:bg-transparent hover:text-destructive"
                                >
                                  Gỡ tệp
                                </Button>
                              </div>
                            ) : (
                              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input p-4 text-xs text-muted-foreground transition-colors hover:bg-accent/40">
                                <Paperclip className="h-4 w-4 text-primary" />
                                <span>
                                  Bấm để chọn tệp từ máy tính (Mô phỏng trải nghiệm ứng viên)
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) setAnswer(q.id, { name: f.name, size: f.size });
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </AdminModal>
      )}
    </AnimatePresence>
  );
}
