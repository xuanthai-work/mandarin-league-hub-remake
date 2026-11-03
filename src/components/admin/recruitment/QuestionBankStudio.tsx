import { useEffect, useState, type FormEvent } from "react";
import { Eye, Loader2, Plus, Search, Sparkles } from "lucide-react";
import {
  QUESTION_BANK,
  QUESTION_KINDS,
  deptName,
  formatTopicPositions,
  parseTopicPositions,
  positionsFor,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CandidatePreviewDrawer } from "./CandidatePreviewDrawer";
import { DepartmentRail } from "./DepartmentRail";
import { RAIL, RAIL_IDS, deptOf } from "./rail";
import { TopicAccordionCard } from "./TopicAccordionCard";
import {
  SELECT_CONTENT,
  SELECT_TRIGGER,
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

/** Master-detail editor for the recruitment question bank (one or more departments at a time). */
export function QuestionBankStudio({
  data,
  run,
  confirm,
}: {
  data: StudioData;
  run: Run;
  confirm: Confirm;
}) {
  // Every bucket starts selected so the studio opens on the whole bank ("Tất cả các ban").
  const [selectedDepts, setSelectedDepts] = useState<string[]>(RAIL_IDS);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loadingBank, setLoadingBank] = useState<string | null>(null);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: "", description: "" });
  // Which bucket the new topic belongs to — only asked when several are selected.
  const [newTopicDept, setNewTopicDept] = useState<string>("common");
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [customPositionInput, setCustomPositionInput] = useState("");

  const questionsOf = (topicId: string) =>
    data.questions
      .filter((q) => q.topic_id === topicId)
      .sort((a, b) => a.sort_order - b.sort_order);
  /** Bucket order (shared first, then the rail order) so combined lists stay stable. */
  const bucketIndex = (department: string | null) => RAIL_IDS.indexOf(department ?? "common");
  const selectedKeys = selectedDepts.map(deptOf);
  const deptTopics = data.topics
    .filter((t) => selectedKeys.includes(t.department))
    .sort(
      (a, b) => bucketIndex(a.department) - bucketIndex(b.department) || a.sort_order - b.sort_order,
    );
  /** Topics of one bucket, in display order — the reorder buttons swap inside this list. */
  const topicsInDept = (department: string | null) =>
    data.topics
      .filter((t) => t.department === department)
      .sort((a, b) => a.sort_order - b.sort_order);

  const isMultiBucket = selectedDepts.length > 1;
  const toggleDept = (id: string) =>
    setSelectedDepts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const selectAllDepts = () => setSelectedDepts(RAIL_IDS);
  const clearDepts = () => setSelectedDepts([]);

  // The applicant preview always simulates one application form: the first selected bucket.
  const previewDept = selectedDepts[0] ?? "common";
  const previewTopics = topicsInDept(deptOf(previewDept));

  /** Department titles plus every custom position already used by the selected buckets. */
  const availablePositions = Array.from(
    new Set([
      ...selectedDepts.filter((id) => id !== "common").flatMap((id) => positionsFor(id)),
      ...deptTopics.flatMap((t) => parseTopicPositions(t.position)),
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
  }, [search, kindFilter, selectedDepts]);

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

  /** Resets the dialog so half-typed positions never leak into the next topic. */
  const closeTopicDialog = () => {
    setTopicDialogOpen(false);
    setSelectedPositions([]);
    setCustomPositionInput("");
    setNewTopic({ title: "", description: "" });
  };

  /** Always asks for the bucket the topic will be created in, defaulting to the first selection. */
  const openTopicDialog = () => {
    setNewTopicDept(selectedDepts[0] ?? "common");
    setTopicDialogOpen(true);
  };

  const togglePosition = (position: string) =>
    setSelectedPositions((prev) =>
      prev.includes(position) ? prev.filter((p) => p !== position) : [...prev, position],
    );

  /** Adds a typed position to the picked list so it saves with the topic right away. */
  const addCustomPosition = () => {
    const next = customPositionInput.trim();
    if (!next) return;
    setSelectedPositions((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setCustomPositionInput("");
  };

  const addTopic = (e: FormEvent) => {
    e.preventDefault();
    const title = newTopic.title.trim();
    if (!title) return;
    // One selected bucket drives the target; with several, the dialog's picker decides.
    const targetRail = isMultiBucket ? newTopicDept : (selectedDepts[0] ?? "common");
    const targetDept = deptOf(targetRail);
    const sortOrder = data.topics.filter((t) => t.department === targetDept).length;
    void run(
      supabase.from("recruitment_topics").insert({
        department: targetDept,
        position: formatTopicPositions(selectedPositions),
        title,
        description: newTopic.description.trim(),
        sort_order: sortOrder,
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
          selectedDepts={selectedDepts}
          onToggleDept={toggleDept}
          onSelectAll={selectAllDepts}
          onClearAll={clearDepts}
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
              <p className="text-sm font-semibold text-foreground">
                {selectedDepts.length === 0
                  ? "Chưa chọn ban nào"
                  : selectedDepts.length === RAIL_IDS.length
                    ? "Tất cả các ban"
                    : selectedDepts.length === 1
                      ? deptName(deptOf(selectedDepts[0]!))
                      : `${selectedDepts.length} ban đã chọn`}
              </p>
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
              onClick={openTopicDialog}
              disabled={selectedDepts.length === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Chủ đề mới
            </button>
          </div>

          {filteredTopics.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {selectedDepts.length === 0
                ? "Chọn ít nhất một ban ở cột bên trái để xem chủ đề."
                : deptTopics.length === 0
                  ? "Ban này chưa có chủ đề nào. Bấm “Chủ đề mới” ở trên để bắt đầu."
                  : "Không có chủ đề nào khớp bộ lọc hiện tại."}
            </p>
          ) : (
            filteredTopics.map((item) => {
              const group = topicsInDept(item.topic.department);
              return (
                <TopicAccordionCard
                  key={item.topic.id}
                  topic={item.topic}
                  questions={item.matchingQuestions}
                  totalQuestionsCount={item.allQuestions.length}
                  availablePositions={availablePositions}
                  departmentName={isMultiBucket ? deptName(item.topic.department) : undefined}
                  index={group.findIndex((t) => t.id === item.topic.id)}
                  total={group.length}
                  expanded={!collapsed.has(item.topic.id)}
                  onToggle={() => toggleTopic(item.topic.id)}
                  onMove={(from, to) => swap(group, from, to, "recruitment_topics")}
                  run={run}
                  confirm={confirm}
                />
              );
            })
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
              {isMultiBucket
                ? "Chọn Ban cho chủ đề mới, sau đó thêm câu hỏi ngay khi tạo xong."
                : `Tạo chủ đề câu hỏi cho ${deptName(deptOf(selectedDepts[0] ?? "common"))}. Có thể thêm câu hỏi ngay sau khi tạo.`}
            </DialogDescription>
          </DialogHeader>
          <form id="new-topic-form" onSubmit={addTopic} className="space-y-2.5">
            {isMultiBucket && (
              <div>
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="new-topic-dept"
                >
                  Thuộc Ban
                </label>
                <Select value={newTopicDept} onValueChange={setNewTopicDept}>
                  <SelectTrigger
                    id="new-topic-dept"
                    aria-label="Ban của chủ đề"
                    className={`mt-1 ${SELECT_TRIGGER}`}
                  >
                    <SelectValue>{deptName(deptOf(newTopicDept))}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    {RAIL.map((item) => (
                      <SelectItem key={item.id} value={item.id} className="text-sm">
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
                {Array.from(new Set([...availablePositions, ...selectedPositions])).map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={selectedPositions.includes(p)}
                    onClick={() => togglePosition(p)}
                    className={positionPill(selectedPositions.includes(p))}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-1.5">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
                  placeholder="Thêm vị trí mới… (VD: Trưởng nhóm Frontend)"
                  aria-label="Thêm vị trí mới"
                  value={customPositionInput}
                  onChange={(e) => setCustomPositionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    addCustomPosition();
                  }}
                />
                <button
                  type="button"
                  disabled={!customPositionInput.trim()}
                  onClick={addCustomPosition}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" />
                  Thêm
                </button>
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
        onClose={() => setPreviewOpen(false)}
        dept={previewDept}
        topics={previewTopics}
        questions={data.questions}
      />
    </div>
  );
}
