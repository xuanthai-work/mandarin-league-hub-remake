import { useEffect, useState, type FormEvent } from "react";
import { Eye, Loader2, Plus, Search, Sparkles } from "lucide-react";
import { QUESTION_BANK, QUESTION_KINDS, deptName, positionsFor } from "@/lib/recruitment";
import { filterQuestionBank } from "@/lib/recruitment-question-search";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CandidatePreviewDrawer } from "./CandidatePreviewDrawer";
import { DepartmentRail } from "./DepartmentRail";
import { TopicAccordionCard } from "./TopicAccordionCard";
import {
  CUSTOM_POSITION,
  SELECT_CONTENT,
  SELECT_TRIGGER,
  isChoiceKind,
  type Confirm,
  type Run,
  type StudioData,
  type Swap,
} from "./types";

const deptOf = (railId: string) => (railId === "common" ? null : railId);

/** Marks the whole-bank seed action in `loadingBank`. */
const ALL = "all";

/** Master-detail editor for the recruitment question bank (one department at a time). */
export function QuestionBankStudio({
  data,
  run,
  confirm,
}: {
  data: StudioData;
  run: Run;
  confirm: Confirm;
}) {
  const [selectedDept, setSelectedDept] = useState("design");
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loadingBank, setLoadingBank] = useState<string | null>(null);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: "", description: "", position: "" });
  const [customPosition, setCustomPosition] = useState(false);
  const [customPositionInput, setCustomPositionInput] = useState("");

  const deptKey = deptOf(selectedDept);
  const questionsOf = (topicId: string) =>
    data.questions
      .filter((q) => q.topic_id === topicId)
      .sort((a, b) => a.sort_order - b.sort_order);
  const deptTopics = data.topics
    .filter((t) => t.department === deptKey)
    .sort((a, b) => a.sort_order - b.sort_order);

  /** Default titles plus every custom position already used by this department. */
  const defaultPositions = deptKey ? positionsFor(deptKey) : [];
  const availablePositions = Array.from(
    new Set([
      ...defaultPositions,
      ...deptTopics
        .map((t) => t.position)
        .filter((p): p is string => Boolean(p && !defaultPositions.includes(p))),
    ]),
  );

  /** Both filters intersect: a question must pass the kind filter AND the search term. */
  const filteredTopics = filterQuestionBank({
    topics: deptTopics,
    questionsOf,
    search,
    kindFilter,
  });
  const isFiltering = search.trim() !== "" || kindFilter !== "all";
  const matchingCount = filteredTopics.reduce((n, t) => n + t.matchingQuestions.length, 0);

  // Opening every matching topic while filtering is more useful than remembering
  // a collapsed state that would hide the results the user just asked for.
  useEffect(() => {
    setCollapsed(new Set());
  }, [search, kindFilter]);

  const stats = {
    topics: data.topics.length,
    questions: data.questions.length,
    required: data.questions.filter((q) => q.required).length,
    choice: data.questions.filter((q) => isChoiceKind(q.kind)).length,
  };

  const toggleTopic = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const swap: Swap = (list, i, j, table) => {
    const a = list[i];
    const b = list[j];
    if (!a || !b) return;
    void run(
      Promise.all([
        supabase.from(table).update({ sort_order: b.sort_order }).eq("id", a.id),
        supabase.from(table).update({ sort_order: a.sort_order }).eq("id", b.id),
      ]).then((r) => ({ error: r.find((x) => x.error)?.error ?? null })),
    );
  };

  /** Seeds the bundled TML bank, either whole or only the entries for one department. */
  const seedBank = async (railId: string) => {
    setLoadingBank(railId);
    const entries =
      railId === ALL ? QUESTION_BANK : QUESTION_BANK.filter((b) => b.department === deptOf(railId));
    for (const entry of entries) {
      for (const [i, topic] of entry.topics.entries()) {
        const { data: row, error } = await supabase
          .from("recruitment_topics")
          .insert({
            department: entry.department,
            position: entry.position,
            title: topic.title,
            description: topic.description,
            sort_order: i,
          })
          .select("id")
          .single();
        if (error || !row) {
          setLoadingBank(null);
          await run(
            Promise.resolve({ error: error ?? { message: "Không nạp được câu hỏi mẫu." } }),
          );
          return;
        }
        await supabase.from("recruitment_questions").insert(
          topic.questions.map((q, j) => ({
            topic_id: row.id,
            prompt: q.prompt,
            kind: q.kind ?? "long",
            options: q.options ?? [],
            required: !!q.required,
            sort_order: j,
          })),
        );
      }
    }
    setLoadingBank(null);
    await run(
      Promise.resolve({ error: null }),
      railId === ALL ? "Đã nạp bộ câu hỏi TML." : "Đã nạp câu hỏi mẫu cho Ban này.",
    );
  };

  /** Resets the dialog so a half-typed custom position never leaks into the next topic. */
  const closeTopicDialog = () => {
    setTopicDialogOpen(false);
    setCustomPosition(false);
    setCustomPositionInput("");
    setNewTopic({ title: "", description: "", position: "" });
  };

  const addTopic = (e: FormEvent) => {
    e.preventDefault();
    const title = newTopic.title.trim();
    if (!title) return;
    const position = (customPosition ? customPositionInput.trim() : newTopic.position) || null;
    if (customPosition && !position) return;
    void run(
      supabase.from("recruitment_topics").insert({
        department: deptKey,
        position,
        title,
        description: newTopic.description.trim(),
        sort_order: deptTopics.length,
      }),
      "Đã thêm chủ đề.",
    ).then((ok) => {
      if (ok) closeTopicDialog();
    });
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {(
          [
            ["Tổng chủ đề", stats.topics],
            ["Tổng câu hỏi", stats.questions],
            ["Câu bắt buộc", stats.required],
            ["Câu trắc nghiệm", stats.choice],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {data.topics.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/40 bg-accent/40 p-4 text-sm">
          <p className="text-foreground">
            Ngân hàng câu hỏi đang trống. Bắt đầu bằng bộ câu hỏi TML đã soạn sẵn.
          </p>
          <button
            type="button"
            disabled={loadingBank === ALL}
            onClick={() => void seedBank(ALL)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loadingBank === ALL ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Nạp bộ câu hỏi TML
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <DepartmentRail
          data={data}
          selected={selectedDept}
          onSelect={setSelectedDept}
          onLoadBank={(id) => void seedBank(id)}
          loadingBank={loadingBank}
        />

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                className="w-full rounded-xl border border-input bg-card py-2 pl-9 pr-3 text-sm shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Tìm chủ đề, câu hỏi hoặc lựa chọn trắc nghiệm…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger
                aria-label="Lọc theo loại câu hỏi"
                className="h-9 w-[170px] rounded-xl border-input bg-card text-xs font-medium shadow-xs"
              >
                <SelectValue>
                  {kindFilter === "all" ? "Mọi loại câu hỏi" : QUESTION_KINDS[kindFilter]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT}>
                <SelectItem value="all" className="text-xs">
                  Mọi loại câu hỏi
                </SelectItem>
                {Object.entries(QUESTION_KINDS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Eye className="h-3.5 w-3.5" />
              Xem trước dạng ứng viên
            </button>
            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setKindFilter("all");
                }}
                className="h-9 rounded-xl border border-dashed border-border px-3 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/30 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{deptName(deptKey)}</p>
              <p className="text-[11px] text-muted-foreground">
                {isFiltering ? (
                  <>
                    {filteredTopics.length}/{deptTopics.length} chủ đề · {matchingCount} câu hỏi
                    khớp
                    {search.trim() && ` · từ khóa "${search.trim()}"`}
                    {kindFilter !== "all" && ` · loại "${QUESTION_KINDS[kindFilter]}"`}
                  </>
                ) : (
                  <>
                    {deptTopics.length} chủ đề ·{" "}
                    {deptTopics.reduce((n, t) => n + questionsOf(t.id).length, 0)} câu hỏi
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTopicDialogOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Chủ đề mới
            </button>
          </div>

          {filteredTopics.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {deptTopics.length === 0
                ? "Ban này chưa có chủ đề nào. Bấm “Chủ đề mới” ở trên để bắt đầu."
                : "Không có chủ đề nào khớp bộ lọc hiện tại."}
            </p>
          ) : (
            filteredTopics.map((item) => (
              <TopicAccordionCard
                key={item.topic.id}
                topic={item.topic}
                questions={item.matchingQuestions}
                totalQuestionsCount={item.allQuestions.length}
                availablePositions={availablePositions}
                index={deptTopics.indexOf(item.topic)}
                total={deptTopics.length}
                expanded={!collapsed.has(item.topic.id)}
                onToggle={() => toggleTopic(item.topic.id)}
                onMove={(from, to) => swap(deptTopics, from, to, "recruitment_topics")}
                onMoveQuestion={(from, to) =>
                  swap(item.matchingQuestions, from, to, "recruitment_questions")
                }
                run={run}
                confirm={confirm}
              />
            ))
          )}
        </div>
      </div>
      <Dialog
        open={topicDialogOpen}
        onOpenChange={(open) => {
          if (open) setTopicDialogOpen(true);
          else closeTopicDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chủ đề mới</DialogTitle>
            <DialogDescription>
              Tạo chủ đề câu hỏi cho {deptName(deptKey)}. Có thể thêm câu hỏi ngay sau khi tạo.
            </DialogDescription>
          </DialogHeader>
          <form id="new-topic-form" onSubmit={addTopic} className="space-y-2.5">
            <div>
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="new-topic-title"
              >
                Tên chủ đề *
              </label>
              <input
                id="new-topic-title"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="VD: Kinh nghiệm thiết kế"
                required
                value={newTopic.title}
                onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="new-topic-desc">
                Mô tả ngắn
              </label>
              <input
                id="new-topic-desc"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Gợi ý nội dung cho ứng viên"
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Vị trí áp dụng</p>
              <Select
                value={customPosition ? CUSTOM_POSITION : newTopic.position || "all"}
                onValueChange={(v) => {
                  if (v === CUSTOM_POSITION) {
                    setCustomPosition(true);
                    setCustomPositionInput("");
                    setNewTopic({ ...newTopic, position: "" });
                    return;
                  }
                  setCustomPosition(false);
                  setNewTopic({ ...newTopic, position: v === "all" ? "" : v });
                }}
              >
                <SelectTrigger aria-label="Vị trí áp dụng" className={`mt-1 ${SELECT_TRIGGER}`}>
                  <SelectValue>
                    {customPosition ? "Vị trí tùy chỉnh" : newTopic.position || "Mọi vị trí"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className={SELECT_CONTENT}>
                  <SelectItem value="all" className="text-sm">
                    Mọi vị trí
                  </SelectItem>
                  {availablePositions.map((p) => (
                    <SelectItem key={p} value={p} className="text-sm">
                      {p}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_POSITION} className="text-sm">
                    + Nhập vị trí mới…
                  </SelectItem>
                </SelectContent>
              </Select>
              {customPosition && (
                <div className="mt-1.5 space-y-1.5">
                  <input
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder="VD: Trưởng nhóm Frontend, CTV Sự kiện…"
                    aria-label="Vị trí tùy chỉnh"
                    required
                    value={customPositionInput}
                    onChange={(e) => setCustomPositionInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPosition(false);
                      setCustomPositionInput("");
                    }}
                    className="text-[11px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                  >
                    Hủy / Chọn từ danh sách
                  </button>
                </div>
              )}
            </div>
          </form>
          <DialogFooter>
            <button
              type="button"
              onClick={closeTopicDialog}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="new-topic-form"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Tạo chủ đề
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CandidatePreviewDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        dept={selectedDept}
        topics={deptTopics}
        questions={data.questions}
      />
    </div>
  );
}
