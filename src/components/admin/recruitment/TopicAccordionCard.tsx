import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import { formatTopicPositions, isDefaultPosition, parseTopicPositions } from "@/lib/recruitment";
import { supabase } from "@/integrations/supabase/client";
import { QuestionItemCard } from "./QuestionItemCard";
import { type Confirm, type Run, type StudioQuestion, type StudioTopic } from "./types";

const iconBtn =
  "grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

/** Pill style for the topic's multi-select position editor. */
const positionPill = (active: boolean) =>
  `rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
  }`;

/** A topic card: collapsible header with inline rename/toggle/reorder and its question list. */
export function TopicAccordionCard({
  topic,
  questions,
  totalQuestionsCount,
  availablePositions,
  index,
  total,
  expanded,
  onToggle,
  onMove,
  onDeletePosition,
  run,
  confirm,
}: {
  topic: StudioTopic;
  /** Questions to render — already trimmed by the studio's search/kind filters. */
  questions: StudioQuestion[];
  /** Every question of the topic, regardless of the active filters. */
  totalQuestionsCount: number;
  /** Department titles plus custom positions already used, offered by the quick-edit select. */
  availablePositions: string[];
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  /** Moves this topic to another index inside the department's topic list. */
  onMove: (from: number, to: number) => void;
  /** Removes a saved custom position from every topic of the department. */
  onDeletePosition: (position: string) => Promise<void>;
  run: Run;
  confirm: Confirm;
}) {
  const [editingPositions, setEditingPositions] = useState(false);
  const [positionDraft, setPositionDraft] = useState<string[]>([]);
  const save = (
    patch: Partial<Pick<StudioTopic, "title" | "description" | "position" | "visible">>,
    ok?: string,
  ) => run(supabase.from("recruitment_topics").update(patch).eq("id", topic.id), ok);
  const filtered = questions.length !== totalQuestionsCount;
  const positions = parseTopicPositions(topic.position);
  // Keep the topic's own positions and anything just typed selectable before saving.
  const positionOptions = Array.from(
    new Set([...availablePositions, ...positions, ...positionDraft]),
  );

  const openPositions = () => {
    setPositionDraft(positions);
    setEditingPositions(true);
  };

  const toggleDraft = (position: string) =>
    setPositionDraft((prev) =>
      prev.includes(position) ? prev.filter((p) => p !== position) : [...prev, position],
    );

  /** Drops a custom position from the draft, or from the whole department after confirming. */
  const deletePosition = async (position: string) => {
    setPositionDraft((prev) => prev.filter((p) => p !== position));
    if (!availablePositions.includes(position)) return;
    const ok = await confirm({
      title: `Xóa vị trí "${position}"?`,
      description:
        "Vị trí này sẽ được gỡ khỏi tất cả các chủ đề thuộc phòng ban. Thao tác không thể hoàn tác.",
      confirmLabel: "Xóa vị trí",
      destructive: true,
    });
    if (!ok) return;
    await onDeletePosition(position);
  };

  const savePositions = () => {
    setEditingPositions(false);
    void save({ position: formatTopicPositions(positionDraft) }, "Đã cập nhật vị trí.");
  };

  return (
    <article
      className={`rounded-2xl border border-border bg-card p-4 transition-opacity ${
        topic.visible ? "" : "opacity-60"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Thu gọn chủ đề" : "Mở rộng chủ đề"}
          className={iconBtn}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "" : "-rotate-90"}`} />
        </button>
        <input
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-semibold"
          defaultValue={topic.title}
          aria-label="Tên chủ đề"
          onBlur={(e) => {
            const title = e.target.value.trim();
            if (title && title !== topic.title) void save({ title });
          }}
        />
        <button
          type="button"
          onClick={() => (editingPositions ? setEditingPositions(false) : openPositions())}
          aria-label="Chỉnh sửa vị trí áp dụng"
          aria-expanded={editingPositions}
          title={positions.length > 0 ? positions.join(", ") : "Mọi vị trí"}
          className={`flex max-w-[240px] items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
            editingPositions
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-transparent bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
          }`}
        >
          <span className="min-w-0 truncate">
            {positions.length > 0 ? positions.join(", ") : "Mọi vị trí"}
          </span>
          <ChevronDown
            aria-hidden
            className={`h-3 w-3 shrink-0 transition-transform ${editingPositions ? "rotate-180" : ""}`}
          />
        </button>

        <span
          className={`rounded-full px-2 py-0.5 text-[11px] ${
            filtered ? "bg-primary/10 font-medium text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {filtered
            ? `Hiển thị ${questions.length}/${totalQuestionsCount} câu`
            : `${totalQuestionsCount} câu`}
        </span>
        <button
          type="button"
          className={iconBtn}
          aria-label={topic.visible ? "Ẩn chủ đề" : "Hiện chủ đề"}
          title={topic.visible ? "Ẩn chủ đề" : "Hiện chủ đề"}
          onClick={() => void save({ visible: !topic.visible })}
        >
          {topic.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          className={iconBtn}
          aria-label="Đưa chủ đề lên"
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={iconBtn}
          aria-label="Đưa chủ đề xuống"
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={`${iconBtn} hover:bg-destructive/10 hover:text-destructive`}
          aria-label="Xóa chủ đề"
          onClick={async () => {
            if (
              !(await confirm({
                title: "Xóa chủ đề?",
                description:
                  "Toàn bộ câu hỏi trong chủ đề này cũng sẽ bị xóa. Thao tác không thể hoàn tác.",
                confirmLabel: "Xóa chủ đề",
                destructive: true,
              }))
            )
              return;
            void run(supabase.from("recruitment_topics").delete().eq("id", topic.id));
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {editingPositions && (
        <div className="mt-2 flex flex-wrap items-start justify-between gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={positionDraft.length === 0}
              onClick={() => setPositionDraft([])}
              className={positionPill(positionDraft.length === 0)}
            >
              Mọi vị trí
            </button>
            {positionOptions.map((p) => {
              const active = positionDraft.includes(p);
              if (isDefaultPosition(topic.department, p)) {
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleDraft(p)}
                    className={positionPill(active)}
                  >
                    {p}
                  </button>
                );
              }
              return (
                <span
                  key={p}
                  className={`inline-flex items-center rounded-full border text-[11px] font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleDraft(p)}
                    className="py-1 pl-2.5 pr-1"
                  >
                    {p}
                  </button>
                  <button
                    type="button"
                    aria-label={`Xóa vị trí ${p}`}
                    title={`Xóa vị trí ${p}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void deletePosition(p);
                    }}
                    className="py-1 pl-0.5 pr-2 opacity-70 transition-opacity hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={savePositions}
              className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Lưu vị trí
            </button>
            <button
              type="button"
              onClick={() => setEditingPositions(false)}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-2.5">
          <input
            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs"
            defaultValue={topic.description}
            placeholder="Mô tả ngắn cho ứng viên"
            aria-label="Mô tả chủ đề"
            onBlur={(e) => {
              if (e.target.value !== topic.description) void save({ description: e.target.value });
            }}
          />
          <div className="space-y-2">
            {questions.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                {totalQuestionsCount === 0
                  ? "Chủ đề này chưa có câu hỏi nào."
                  : "Không có câu hỏi nào trong chủ đề này khớp bộ lọc hiện tại."}
              </p>
            )}
            {questions.map((question, i) => (
              <QuestionItemCard
                key={question.id}
                question={question}
                index={i}
                run={run}
                confirm={confirm}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              void run(
                supabase.from("recruitment_questions").insert({
                  topic_id: topic.id,
                  prompt: "Câu hỏi mới",
                  sort_order: totalQuestionsCount,
                }),
                "Đã thêm câu hỏi.",
              )
            }
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/40 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm câu hỏi vào chủ đề này
          </button>
        </div>
      )}
    </article>
  );
}
