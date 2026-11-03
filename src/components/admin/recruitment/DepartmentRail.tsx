import { Check, Globe, ListPlus } from "lucide-react";
import { RAIL, RAIL_IDS, bankTopicCount, deptOf } from "./rail";
import type { StudioData } from "./types";

/**
 * Left column of the studio: pick one or more departments whose topics are being
 * edited. Selections are additive (checkbox style) and can be combined freely.
 */
export function DepartmentRail({
  data,
  selectedDepts,
  onToggleDept,
  onSelectAll,
  onClearAll,
  onLoadBank,
  loadingBank,
}: {
  data: StudioData;
  /** Rail ids currently selected; may hold any number of buckets. */
  selectedDepts: string[];
  /** Adds the bucket to the selection, or removes it when already selected. */
  onToggleDept: (id: string) => void;
  /** Selects every bucket (shared questions + all departments). */
  onSelectAll: () => void;
  /** Clears the selection so the admin can start a fresh combination. */
  onClearAll: () => void;
  onLoadBank: (id: string) => void;
  loadingBank: string | null;
}) {
  const questionsByTopic = new Map<string, number>();
  for (const q of data.questions)
    questionsByTopic.set(q.topic_id, (questionsByTopic.get(q.topic_id) ?? 0) + 1);

  const stats = (id: string) => {
    const topics = data.topics.filter((t) => t.department === deptOf(id));
    return {
      topics: topics.length,
      questions: topics.reduce((n, t) => n + (questionsByTopic.get(t.id) ?? 0), 0),
    };
  };

  const allSelected = RAIL_IDS.every((id) => selectedDepts.includes(id));
  const totals = { topics: data.topics.length, questions: data.questions.length };

  /** Checkbox marker: filled with a check when the bucket is part of the filter. */
  const marker = (active: boolean) => (
    <span
      aria-hidden
      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/40 bg-background"
      }`}
    >
      {active && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  );

  const rowClass = (active: boolean) =>
    `flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
      active ? "bg-primary/10 text-primary ring-1 ring-primary/40 ring-inset" : "hover:bg-accent"
    }`;

  return (
    <aside className="rounded-2xl border border-border bg-card p-2.5 lg:sticky lg:top-4 lg:self-start">
      <div className="flex items-center justify-between gap-2 px-2 pb-1.5 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Ban tuyển dụng
        </p>
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-medium text-muted-foreground">
            {selectedDepts.length}/{RAIL_IDS.length} chọn
          </p>
          {selectedDepts.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-md px-1 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Bỏ chọn
            </button>
          )}
        </div>
      </div>
      {/* p-1 keeps the active ring inside the scroll box so its left edge is never clipped. */}
      <div className="max-h-[420px] space-y-1 overflow-y-auto p-1 lg:max-h-[calc(100vh-220px)]">
        <button
          type="button"
          onClick={onSelectAll}
          aria-pressed={allSelected}
          title="Chọn tất cả các ban"
          className={rowClass(allSelected)}
        >
          {marker(allSelected)}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-semibold">Tất cả các ban</span>
            </span>
            <span className="block text-[11px] font-normal text-muted-foreground">
              {totals.topics} chủ đề · {totals.questions} câu
            </span>
          </span>
        </button>

        <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
          Chọn nhiều ban để lọc kết hợp
        </p>

        {RAIL.map((item) => {
          const active = selectedDepts.includes(item.id);
          const s = stats(item.id);
          const seedable = s.topics === 0 && bankTopicCount(item.id) > 0;
          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => onToggleDept(item.id)}
                aria-pressed={active}
                title={active ? `Bỏ chọn ${item.name}` : `Chọn ${item.name}`}
                className={rowClass(active)}
              >
                {marker(active)}
                <span className="min-w-0 flex-1">
                  <span
                    className={`flex items-center gap-1.5 text-sm ${
                      active ? "font-semibold" : "font-medium text-foreground"
                    }`}
                  >
                    {item.id === "common" && (
                      <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    {s.topics} chủ đề · {s.questions} câu
                    {item.hint && ` · ${item.hint}`}
                  </span>
                </span>
              </button>
              {seedable && (
                <button
                  type="button"
                  disabled={loadingBank === item.id}
                  onClick={() => onLoadBank(item.id)}
                  className="ml-7 mt-1 mb-1.5 inline-flex items-center gap-1 rounded-lg border border-dashed border-primary/40 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
                >
                  <ListPlus className="h-3 w-3" />
                  {loadingBank === item.id ? "Đang nạp…" : "Nạp câu hỏi mẫu Ban này"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
