import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatTopicPositions, isDefaultPosition, parseTopicPositions } from "@/lib/recruitment";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AdminInput } from "@/components/admin/kit/AdminInput";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuestionItemCard } from "./QuestionItemCard";
import { type Confirm, type Run, type StudioQuestion, type StudioTopic } from "./types";

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
  const [draftPositions, setDraftPositions] = useState<string[] | null>(null);
  const [checking, setChecking] = useState(false);
  const save = (
    patch: Partial<Pick<StudioTopic, "title" | "description" | "position" | "visible">>,
    ok?: string,
  ) => run(supabase.from("recruitment_topics").update(patch).eq("id", topic.id), ok);
  const filtered = questions.length !== totalQuestionsCount;
  // Optimistic list while the save round-trips, so rapid clicks never build on stale data.
  const positions = draftPositions ?? parseTopicPositions(topic.position);
  // Keep the topic's own positions and any custom position already used in the department.
  const positionOptions = Array.from(new Set([...availablePositions, ...positions]));

  useEffect(() => setDraftPositions(null), [topic.position]);

  /** Applies a position list immediately; reverts the optimistic list if the save fails. */
  const applyPositions = (next: string[]) => {
    setDraftPositions(next);
    void save({ position: formatTopicPositions(next) }, "Đã cập nhật vị trí.").then((ok) => {
      if (!ok) setDraftPositions(null);
    });
  };

  /** Drops a custom position from every topic of the department after confirming. */
  const deletePosition = async (position: string) => {
    if (!availablePositions.includes(position)) return;
    const ok = await confirm({
      title: `Xóa vị trí "${position}"?`,
      description:
        "Vị trí này sẽ được gỡ khỏi tất cả các chủ đề thuộc phòng ban. Thao tác không thể hoàn tác.",
      confirmLabel: "Xóa vị trí",
      destructive: true,
    });
    if (!ok) return;
    setDraftPositions((prev) => (prev ? prev.filter((p) => p !== position) : prev));
    await onDeletePosition(position);
  };

  /** Answered topics are only hidden, so existing applications keep their question text. */
  const remove = async () => {
    setChecking(true);
    const { data: answered, error } = await supabase.rpc("recruitment_answer_count", {
      _topic: topic.id,
    });
    setChecking(false);
    if (error) {
      toast.error("Chưa kiểm tra được câu trả lời của ứng viên: " + error.message);
      return;
    }
    if ((answered ?? 0) > 0) {
      const hide = await confirm({
        title: "Không thể xóa chủ đề này",
        description: topic.visible
          ? `${answered} ứng viên đã trả lời câu hỏi trong chủ đề này. Xóa sẽ làm hồ sơ của họ mất nội dung câu hỏi. Hãy ẩn chủ đề để ứng viên mới không thấy nữa.`
          : `${answered} ứng viên đã trả lời câu hỏi trong chủ đề này nên không thể xóa. Chủ đề đang được ẩn, ứng viên mới đã không thấy.`,
        confirmLabel: topic.visible ? "Ẩn chủ đề" : "Đã hiểu",
      });
      if (hide && topic.visible) void save({ visible: false }, "Đã ẩn chủ đề.");
      return;
    }
    const ok = await confirm({
      title: "Xóa chủ đề?",
      description: "Toàn bộ câu hỏi trong chủ đề này cũng sẽ bị xóa. Thao tác không thể hoàn tác.",
      confirmLabel: "Xóa chủ đề",
      destructive: true,
    });
    if (!ok) return;
    void run(supabase.from("recruitment_topics").delete().eq("id", topic.id), "Đã xóa chủ đề.");
  };

  return (
    <article
      className={`rounded-2xl border border-border bg-card p-4 transition-opacity ${
        topic.visible ? "" : "opacity-60"
      }`}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="admin-icon"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Thu gọn chủ đề" : "Mở rộng chủ đề"}
            className="text-muted-foreground"
          >
            <ChevronDown className={`transition-transform ${expanded ? "" : "-rotate-90"}`} />
          </Button>
          <AdminInput
            className="h-8 min-w-0 flex-1 font-semibold"
            defaultValue={topic.title}
            aria-label="Tên chủ đề"
            onBlur={(e) => {
              const title = e.target.value.trim();
              if (title && title !== topic.title) void save({ title });
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-1.5 pl-10 md:justify-end md:pl-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="Chỉnh sửa vị trí áp dụng"
                  title={positions.length > 0 ? positions.join(", ") : "Mọi vị trí"}
                  className="h-auto min-w-0 max-w-[160px] gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-none hover:text-foreground data-[state=open]:bg-primary/10 data-[state=open]:text-primary sm:max-w-[240px] [&_svg]:size-3"
                >
                  <span className="min-w-0 truncate">
                    {positions.length > 0 ? positions.join(", ") : "Mọi vị trí"}
                  </span>
                  <ChevronDown aria-hidden className="shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px]">
                <DropdownMenuCheckboxItem
                  checked={positions.length === 0}
                  onCheckedChange={() => applyPositions([])}
                  onSelect={(e) => e.preventDefault()}
                  className="text-xs"
                >
                  Mọi vị trí
                </DropdownMenuCheckboxItem>
                {positionOptions.map((p) => (
                  <DropdownMenuCheckboxItem
                    key={p}
                    checked={positions.includes(p)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...positions, p]
                        : positions.filter((item) => item !== p);
                      applyPositions(next);
                    }}
                    onSelect={(e) => e.preventDefault()}
                    className="text-xs"
                  >
                    <span className="min-w-0 flex-1 truncate">{p}</span>
                    {!isDefaultPosition(topic.department, p) && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-5 w-5 shrink-0 rounded p-0 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive [&_svg]:size-3"
                        aria-label={`Xóa vị trí ${p}`}
                        title={`Xóa vị trí ${p}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void deletePosition(p);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    )}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                filtered
                  ? "bg-primary/10 font-medium text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {filtered
                ? `${questions.length}/${totalQuestionsCount} câu`
                : `${totalQuestionsCount} câu`}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="admin-icon"
              className="text-muted-foreground [&_svg]:size-3.5"
              aria-label={topic.visible ? "Ẩn chủ đề" : "Hiện chủ đề"}
              title={topic.visible ? "Ẩn chủ đề" : "Hiện chủ đề"}
              onClick={() => void save({ visible: !topic.visible })}
            >
              {topic.visible ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="admin-icon"
              className="text-muted-foreground [&_svg]:size-3.5"
              aria-label="Đưa chủ đề lên"
              disabled={index === 0}
              onClick={() => onMove(index, index - 1)}
            >
              <ArrowUp aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="admin-icon"
              className="text-muted-foreground [&_svg]:size-3.5"
              aria-label="Đưa chủ đề xuống"
              disabled={index === total - 1}
              onClick={() => onMove(index, index + 1)}
            >
              <ArrowDown aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="admin-icon"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Xóa chủ đề"
              disabled={checking}
              onClick={() => void remove()}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2.5">
          <AdminInput
            className="h-8 text-xs"
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
          <Button
            type="button"
            variant="outline"
            size="admin-sm"
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
            className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:text-primary [&_svg]:size-3.5"
          >
            <Plus aria-hidden /> Thêm câu hỏi vào chủ đề này
          </Button>
        </div>
      )}
    </article>
  );
}
