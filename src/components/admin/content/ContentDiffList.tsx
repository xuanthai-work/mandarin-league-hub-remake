import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import type { FieldChange } from "@/lib/site-content-fields";

export interface ContentDiffListProps {
  changes: FieldChange[];
  emptyText?: string;
}

export function ContentDiffList({
  changes,
  emptyText = "Không có thay đổi nào.",
}: ContentDiffListProps) {
  const groups = useMemo(() => {
    const map = new Map<string, FieldChange[]>();
    for (const c of changes) {
      const list = map.get(c.block) ?? [];
      list.push(c);
      map.set(c.block, list);
    }
    return Array.from(map.entries());
  }, [changes]);

  if (changes.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map(([blockName, items]) => (
        <div key={blockName} className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {blockName}
          </h4>
          <div className="space-y-2">
            {items.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-border bg-background p-3 space-y-1.5"
              >
                <p className="text-xs font-medium text-foreground">{c.label}</p>
                <div className="flex items-start gap-1.5 text-sm text-muted-foreground line-through decoration-muted-foreground/50 line-clamp-3 break-words">
                  {c.beforeDefault && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal no-underline shrink-0">
                      Mặc định
                    </span>
                  )}
                  <span className={c.beforeDefault ? "italic" : undefined}>{c.before}</span>
                </div>
                <div className="flex items-start gap-1.5 text-sm text-foreground line-clamp-3 break-words">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {c.afterDefault && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground shrink-0">
                      Mặc định
                    </span>
                  )}
                  <span className={c.afterDefault ? "italic" : undefined}>{c.after}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
