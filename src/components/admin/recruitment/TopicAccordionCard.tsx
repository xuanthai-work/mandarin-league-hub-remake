import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { QuestionItemCard } from "./QuestionItemCard";
import {
  CUSTOM_POSITION,
  SELECT_CONTENT,
  type Confirm,
  type Run,
  type StudioQuestion,
  type StudioTopic,
} from "./types";

const iconBtn =
  "grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

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
  onMoveQuestion,
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
  /** Moves a question inside this topic. */
  onMoveQuestion: (from: number, to: number) => void;
  run: Run;
  confirm: Confirm;
}) {
  const [customPosition, setCustomPosition] = useState(false);
  const [positionDraft, setPositionDraft] = useState("");
  const save = (
    patch: Partial<Pick<StudioTopic, "title" | "description" | "position" | "visible">>,
    ok?: string,
  ) => run(supabase.from("recruitment_topics").update(patch).eq("id", topic.id), ok);
  const filtered = questions.length !== totalQuestionsCount;
  // Keep the topic's own title selectable even if it is not in the department list yet.
  const positionOptions =
    topic.position && !availablePositions.includes(topic.position)
      ? [...availablePositions, topic.position]
      : availablePositions;

  const savePosition = (position: string | null) => {
    setCustomPosition(false);
    setPositionDraft("");
    void save({ position }, "Đã cập nhật vị trí.");
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
        <Select
          value={customPosition ? CUSTOM_POSITION : (topic.position ?? "all")}
          onValueChange={(v) => {
            if (v === CUSTOM_POSITION) {
              setPositionDraft("");
              setCustomPosition(true);
              return;
            }
            savePosition(v === "all" ? null : v);
          }}
        >
          <SelectTrigger
            aria-label="Vị trí áp dụng"
            className="h-6 w-auto gap-1 rounded-full border-0 bg-secondary px-2.5 py-0 text-[11px] font-medium text-muted-foreground shadow-none [&>svg]:h-3 [&>svg]:w-3"
          >
            <SelectValue>
              {customPosition ? "Vị trí mới…" : (topic.position ?? "Mọi vị trí")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT}>
            <SelectItem value="all" className="text-xs">
              Mọi vị trí
            </SelectItem>
            {positionOptions.map((p) => (
              <SelectItem key={p} value={p} className="text-xs">
                {p}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_POSITION} className="text-xs">
              + Nhập vị trí mới…
            </SelectItem>
          </SelectContent>
        </Select>
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

      {customPosition && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2">
          <input
            autoFocus
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 py-1 text-xs"
            placeholder="VD: Trưởng nhóm Frontend, CTV Sự kiện…"
            aria-label="Vị trí tùy chỉnh"
            value={positionDraft}
            onChange={(e) => setPositionDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setCustomPosition(false);
                return;
              }
              if (e.key !== "Enter") return;
              e.preventDefault();
              const next = positionDraft.trim();
              if (next) savePosition(next);
            }}
          />
          <button
            type="button"
            disabled={!positionDraft.trim()}
            onClick={() => savePosition(positionDraft.trim())}
            className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Lưu
          </button>
          <button
            type="button"
            onClick={() => setCustomPosition(false)}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            Hủy
          </button>
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
