import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "@/lib/site-content-fields";
import type { HomeSectionKey } from "@/lib/site-content";

export interface ContentOutlineProps {
  blocks: ContentBlock<string>[];
  activeId: string;
  onSelect: (id: string) => void;
  show?: Record<HomeSectionKey, boolean> | undefined;
  onToggle?: ((k: HomeSectionKey, v: boolean) => void) | undefined;
  dirtyIds: Set<string>;
  title: string;
}

export function ContentOutline({
  blocks,
  activeId,
  onSelect,
  show,
  onToggle,
  dirtyIds,
  title,
}: ContentOutlineProps) {
  return (
    <div>
      {/* Mobile view (< lg): shadcn Select */}
      <div className="lg:hidden">
        <label
          htmlFor="content-block-select"
          className="mb-1.5 block text-xs font-semibold text-muted-foreground"
        >
          {title}
        </label>
        <Select value={activeId} onValueChange={onSelect}>
          <SelectTrigger id="content-block-select" className="w-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {blocks.map((block, idx) => (
              <SelectItem key={block.id} value={block.id}>
                {idx + 1}. {block.label}
                {dirtyIds.has(block.id) ? " •" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop view (>= lg): vertical list card */}
      <div className="hidden lg:block rounded-xl border border-border bg-card p-2 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
        {blocks.map((block, idx) => {
          const isSelected = activeId === block.id;
          const isOff = block.toggle && show ? show[block.toggle] === false : false;
          const isDirty = dirtyIds.has(block.id);

          return (
            <div
              key={block.id}
              className={cn(
                "relative flex min-h-[44px] items-center gap-2 rounded-lg pr-3 transition-colors",
                isSelected
                  ? "bg-primary/5 font-medium text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-full before:bg-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(block.id)}
                aria-current={isSelected ? "true" : undefined}
                className="flex min-w-0 flex-1 items-center gap-2 self-stretch px-3 py-2 text-left text-sm cursor-pointer"
              >
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {idx + 1}.
                </span>
                <span
                  className={cn(
                    "truncate",
                    isOff && "opacity-60 line-through text-muted-foreground",
                  )}
                >
                  {block.label}
                </span>
                {isDirty && (
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                    aria-label="Có thay đổi chưa lưu"
                  />
                )}
              </button>

              <span className="shrink-0 flex items-center gap-1.5">
                {block.toggle && show && onToggle && (
                  <Switch
                    checked={show[block.toggle] ?? true}
                    onCheckedChange={(v) => onToggle(block.toggle!, v)}
                    aria-label={`Hiện khối ${block.label}`}
                  />
                )}
                {block.always && (
                  <span className="text-[11px] text-muted-foreground">Luôn hiện</span>
                )}
                {block.auto && <span className="text-[11px] text-muted-foreground">Tự động</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
