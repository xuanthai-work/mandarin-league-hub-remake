import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import {
  QUESTION_BANK,
  QUESTION_KINDS,
  deptName,
  formatTopicPositions,
  isDefaultPosition,
  parseTopicPositions,
  positionsFor,
  removePositionFromTopicString,
} from "@/lib/recruitment";
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CandidatePreviewDrawer } from "./CandidatePreviewDrawer";
import { DepartmentRail } from "./DepartmentRail";
import { deptOf } from "./rail";
import { TopicAccordionCard } from "./TopicAccordionCard";
import {
  isChoiceKind,
  type Confirm,
  type Run,
  type StudioData,
  type Swap,
} from "./types";

/** Marks the whole-bank seed action in `loadingBank`. */
const ALL = "all";

/** Pill style for the new-topic multi-select position picker. */
const positionPill = (active: boolean) =>
  `rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
  }`;

/** Master-detail editor for the recruitment question bank: one department at a time. */
export function QuestionBankStudio({
  data,
  run,
  confirm,
  previewOpen,
  onClosePreview,
}: {
  data: StudioData;
  run: Run;
  confirm: Confirm;
  /** Applicant preview drawer, opened from the tab row above the studio. */
  previewOpen: boolean;
  onClosePreview: () => void;
}) {
  const [selectedDept, setSelectedDept] = useState("design");
  const [search, setSearch] = useState("");
  // Empty list = every kind; otherwise each checked kind is shown (multi-select).
  const [kindFilters, setKindFilters] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loadingBank, setLoadingBank] = useState<string | null>(null);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: "", description: "" });
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  const deptKey = deptOf(selectedDept);
  const questionsOf = (topicId: string) =>
    data.questions
      .filter((q) => q.topic_id === topicId)
      .sort((a, b) => a.sort_order - b.sort_order);
  const deptTopics = data.topics
    .filter((t) => t.department === deptKey)
    .sort((a, b) => a.sort_order - b.sort_order);

  /** Department titles plus every custom position already used by its topics. */
  const availablePositions = Array.from(
    new Set([
      ...(deptKey ? positionsFor(deptKey) : []),
      ...deptTopics.flatMap((t) => parseTopicPositions(t.position)),
    ]),
  );

  const toggleKind = (kind: string) =>
    setKindFilters((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
    );
  const kindLabel =
    kindFilters.length === 0
      ? "Mọi loại câu hỏi"
      : kindFilters.length === 1
        ? (QUESTION_KINDS[kindFilters[0]!] ?? kindFilters[0]!)
        : `${kindFilters.length} loại câu hỏi`;

  /** Both filters intersect: a question must pass the kind filter AND the search term. */
  const filteredTopics = filterQuestionBank({
    topics: deptTopics,
    questionsOf,
    search,
    kinds: kindFilters,
  });
  const isFiltering = search.trim() !== "" || kindFilters.length > 0;
  const matchingCount = filteredTopics.reduce((n, t) => n + t.matchingQuestions.length, 0);

  // Opening every matching topic while filtering is more useful than remembering
  // a collapsed state that would hide the results the user just asked for.
  useEffect(() => {
    setCollapsed(new Set());
  }, [search, kindFilters]);

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

  /** Resets the dialog so half-picked positions never leak into the next topic. */
  const closeTopicDialog = () => {
    setTopicDialogOpen(false);
    setSelectedPositions([]);
    setNewTopic({ title: "", description: "" });
  };

  const togglePosition = (position: string) =>
    setSelectedPositions((prev) =>
      prev.includes(position) ? prev.filter((p) => p !== position) : [...prev, position],
    );

  /** Removes a saved custom position from every topic of the selected department. */
  const deleteDepartmentPosition = async (position: string) => {
    const affected = deptTopics.filter((t) =>
      parseTopicPositions(t.position).includes(position),
    );
    if (affected.length === 0) return;
    await run(
      Promise.all(
        affected.map((t) =>
          supabase
            .from("recruitment_topics")
            .update({ position: removePositionFromTopicString(t.position, position) })
            .eq("id", t.id),
        ),
      ).then((r) => ({ error: r.find((x) => x.error)?.error ?? null })),
      "Đã xóa vị trí.",
    );
  };

  /** Drops a custom position from the draft, or from the department after confirming. */
  const deleteSelectedPosition = async (position: string) => {
    setSelectedPositions((prev) => prev.filter((p) => p !== position));
    if (!availablePositions.includes(position)) return;
    const ok = await confirm({
      title: `Xóa vị trí "${position}"?`,
      description:
        "Vị trí này sẽ được gỡ khỏi tất cả các chủ đề thuộc phòng ban. Thao tác không thể hoàn tác.",
      confirmLabel: "Xóa vị trí",
      destructive: true,
    });
    if (!ok) return;
    await deleteDepartmentPosition(position);
  };

  const addTopic = (e: FormEvent) => {
    e.preventDefault();
    const title = newTopic.title.trim();
    if (!title) return;
    void run(
      supabase.from("recruitment_topics").insert({
        department: deptKey,
        position: formatTopicPositions(selectedPositions),
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Lọc theo loại câu hỏi"
                  className="inline-flex h-9 w-[170px] items-center justify-between gap-1 rounded-xl border border-input bg-card px-3 text-xs font-medium shadow-xs transition-colors hover:bg-accent/60"
                >
                  <span className="truncate">{kindLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuCheckboxItem
                  checked={kindFilters.length === 0}
                  onCheckedChange={() => setKindFilters([])}
                  onSelect={(e) => e.preventDefault()}
                  className="text-xs"
                >
                  Mọi loại câu hỏi
                </DropdownMenuCheckboxItem>
                {Object.entries(QUESTION_KINDS).map(([k, v]) => (
                  <DropdownMenuCheckboxItem
                    key={k}
                    checked={kindFilters.includes(k)}
                    onCheckedChange={() => toggleKind(k)}
                    onSelect={(e) => e.preventDefault()}
                    className="text-xs"
                  >
                    {v}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setKindFilters([]);
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
                    {kindFilters.length > 0 &&
                      ` · loại "${kindFilters.map((k) => QUESTION_KINDS[k] ?? k).join(", ")}"`}
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
                onDeletePosition={deleteDepartmentPosition}
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
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Chọn một hoặc nhiều vị trí. Để trống nghĩa là mọi vị trí.
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  aria-pressed={selectedPositions.length === 0}
                  onClick={() => setSelectedPositions([])}
                  className={positionPill(selectedPositions.length === 0)}
                >
                  Mọi vị trí
                </button>
                {Array.from(new Set([...availablePositions, ...selectedPositions])).map((p) => {
                  const active = selectedPositions.includes(p);
                  if (isDefaultPosition(deptKey, p)) {
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={active}
                        onClick={() => togglePosition(p)}
                        className={positionPill(active)}
                      >
                        {p}
                      </button>
                    );
                  }
                  return (
                    <span
                      key={p}
                      className={`inline-flex items-center rounded-full border text-xs font-medium transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => togglePosition(p)}
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
                          void deleteSelectedPosition(p);
                        }}
                        className="py-1 pl-0.5 pr-2 opacity-70 transition-opacity hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
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
        onClose={onClosePreview}
        dept={selectedDept}
        topics={deptTopics}
        questions={data.questions}
      />
    </div>
  );
}
