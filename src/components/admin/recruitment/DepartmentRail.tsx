import { Globe, ListPlus } from "lucide-react";
import { QUESTION_BANK, RECRUIT_DEPTS } from "@/lib/recruitment";
import type { StudioData } from "./types";

/** Shared bucket first, then every recruitment department. */
const RAIL = [
  { id: "common", name: "Câu hỏi chung", hint: "Mọi ứng viên" },
  ...RECRUIT_DEPTS.map((d) => ({ id: d.id, name: d.name, hint: "" })),
];

const deptOf = (id: string) => (id === "common" ? null : id);

/** How many topics the bundled TML bank can seed for this bucket (0 = nothing to seed). */
const bankTopicCount = (id: string) =>
  QUESTION_BANK.filter((b) => b.department === deptOf(id)).reduce((n, b) => n + b.topics.length, 0);

/** Left column of the studio: pick the department whose topics are being edited. */
export function DepartmentRail({
  data,
  selected,
  onSelect,
  onLoadBank,
  loadingBank,
}: {
  data: StudioData;
  selected: string;
  onSelect: (id: string) => void;
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

  return (
    <aside className="rounded-2xl border border-border bg-card p-2.5 lg:sticky lg:top-4 lg:self-start">
      <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Ban tuyển dụng
      </p>
      <div className="max-h-[420px] space-y-0.5 overflow-y-auto pr-0.5 lg:max-h-[calc(100vh-220px)]">
        {RAIL.map((item) => {
          const active = selected === item.id;
          const s = stats(item.id);
          const seedable = s.topics === 0 && bankTopicCount(item.id) > 0;
          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={active ? "true" : undefined}
                className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                  active ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-accent"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    s.questions > 0 ? "bg-success" : "bg-muted-foreground/30"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`flex items-center gap-1.5 text-sm ${active ? "font-semibold text-primary" : "font-medium text-foreground"}`}
                  >
                    {item.id === "common" && (
                      <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
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
