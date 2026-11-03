import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { QuestionItemCard } from "./QuestionItemCard";
import type { Confirm, Run, StudioQuestion, StudioTopic } from "./types";

const iconBtn =
  "grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

/** A topic card: collapsible header with inline rename/toggle/reorder and its question list. */
export function TopicAccordionCard({
  topic,
  questions,
  totalQuestionsCount,
  index,
  total,
  expanded,
  onToggle,
  onMove,
  onMoveQuestion,
  run,
  confirm,
}: {
  topic: StudioTopic;
  /** Questions to render — already trimmed by the studio's search/kind filters. */
  questions: StudioQuestion[];
  /** Every question of the topic, regardless of the active filters. */
  totalQuestionsCount: number;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  /** Moves this topic to another index inside the department's topic list. */
  onMove: (from: number, to: number) => void;
  /** Moves a question inside this topic. */
  onMoveQuestion: (from: number, to: number) => void;
  run: Run;
  confirm: Confirm;
}) {
  const save = (
    patch: Partial<Pick<StudioTopic, "title" | "description" | "visible">>,
    ok?: string,
  ) => run(supabase.from("recruitment_topics").update(patch).eq("id", topic.id), ok);
  const filtered = questions.length !== totalQuestionsCount;

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
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {topic.position ?? "Mọi vị trí"}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] ${
            filtered ? "bg-primary/10 font-medium text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {filtered
            ? `Hiển thị ${questions.length}/${totalQuestionsCount} câu`
            : `${totalQuestionsCount} câu`}
        </span>
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Switch
            checked={topic.visible}
            onCheckedChange={(visible) => void save({ visible })}
            aria-label="Hiển thị chủ đề"
          />
          Hiện
        </label>
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
                total={questions.length}
                run={run}
                confirm={confirm}
                onSwap={onMoveQuestion}
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
