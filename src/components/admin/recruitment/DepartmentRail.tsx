import { Globe, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RAIL, bankTopicCount, deptOf } from "./rail";
import type { StudioData } from "./types";

/** Left column of the studio: pick the department whose topics are being edited. */
export function DepartmentRail({
  data,
  selected,
  onSelect,
  onLoadBank,
  loadingBank,
  readOnly = false,
}: {
  data: StudioData;
  selected: string;
  onSelect: (id: string) => void;
  onLoadBank: (id: string) => void;
  loadingBank: string | null;
  readOnly?: boolean;
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
      {/* p-1 keeps the active ring inside the scroll box so its left edge is never clipped. */}
      <div className="max-h-[420px] space-y-1 overflow-y-auto p-1 lg:max-h-[calc(100vh-220px)]">
        {RAIL.map((item) => {
          const active = selected === item.id;
          const s = stats(item.id);
          const seedable = s.topics === 0 && bankTopicCount(item.id) > 0;
          return (
            <div key={item.id}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSelect(item.id)}
                aria-current={active ? "true" : undefined}
                className={`h-auto w-full items-start justify-start gap-2.5 whitespace-normal rounded-xl px-2.5 py-2 text-left font-normal ${
                  active
                    ? "bg-primary/10 ring-1 ring-primary/40 ring-inset hover:bg-primary/10"
                    : ""
                } [&_svg]:size-3.5`}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={`flex items-center gap-1.5 text-sm ${
                      active ? "font-semibold text-primary" : "font-medium text-foreground"
                    }`}
                  >
                    {item.id === "common" && <Globe className="shrink-0 text-muted-foreground" />}
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {s.topics} chủ đề · {s.questions} câu
                    {item.hint && ` · ${item.hint}`}
                  </span>
                </span>
              </Button>
              {seedable && !readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingBank === item.id}
                  onClick={() => {
                    if (readOnly) return;
                    onLoadBank(item.id);
                  }}
                  className="ml-7 mt-1 mb-1.5 h-auto gap-1 rounded-lg border-dashed border-primary/40 px-2 py-1 text-[11px] font-medium text-primary shadow-none hover:bg-primary/5 hover:text-primary [&_svg]:size-3"
                >
                  <ListPlus aria-hidden />
                  {loadingBank === item.id ? "Đang nạp…" : "Nạp câu hỏi mẫu Ban này"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
