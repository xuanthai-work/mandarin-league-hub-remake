import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronRight, FileText, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { HomeSection, NavPage } from "@/lib/site-content-fields";
import type { HomeSectionKey } from "@/lib/site-content";

export type ContentSelection = { kind: "section"; id: string } | { kind: "page"; id: string };

export interface SectionOutlineProps {
  sections: HomeSection[];
  /** Navigation Page, phân cấp theo `sectionId` — không hardcode danh sách. */
  navPages: NavPage<string>[];
  selection: ContentSelection;
  onSelectSection: (id: string) => void;
  onSelectPage: (id: string) => void;
  show?: Record<HomeSectionKey, boolean> | undefined;
  onToggle?: ((k: HomeSectionKey, v: boolean) => void) | undefined;
  dirtySectionIds: Set<string>;
  dirtyPageIds: Set<string>;
}

/**
 * Cây nội dung của “Trang & Nội dung”:
 * Section của trang chủ → các Navigation Page thuộc Section đó.
 * Content Block không nằm ở sidebar; chúng hiện trong panel của Section.
 */
export function SectionOutline({
  sections,
  navPages,
  selection,
  onSelectSection,
  onSelectPage,
  show,
  onToggle,
  dirtySectionIds,
  dirtyPageIds,
}: SectionOutlineProps) {
  const { mainSections, auxiliarySections, numberById, pagesBySection } = useMemo(() => {
    const numbers = new Map<string, number>();
    let index = 0;
    for (const section of sections) {
      if (!section.auxiliary) numbers.set(section.id, ++index);
    }
    const bySection = new Map<string, NavPage<string>[]>();
    for (const page of navPages) {
      const list = bySection.get(page.sectionId) ?? [];
      list.push(page);
      bySection.set(page.sectionId, list);
    }
    return {
      mainSections: sections.filter((section) => !section.auxiliary),
      auxiliarySections: sections.filter((section) => section.auxiliary),
      numberById: numbers,
      pagesBySection: bySection,
    };
  }, [sections, navPages]);

  // Mặc định mở sẵn cả cây; người dùng có thể thu gọn từng Section.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const selectedPage =
    selection.kind === "page" ? navPages.find((page) => page.id === selection.id) : undefined;
  const activeSectionId = selection.kind === "section" ? selection.id : selectedPage?.sectionId;

  useEffect(() => {
    if (!selectedPage) return;
    setCollapsed((prev) => {
      if (!prev.has(selectedPage.sectionId)) return prev;
      const next = new Set(prev);
      next.delete(selectedPage.sectionId);
      return next;
    });
  }, [selectedPage]);

  const toggleGroup = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const row = (section: HomeSection) => {
    const children = pagesBySection.get(section.id) ?? [];
    const isOpen = !collapsed.has(section.id);
    const isSelected = selection.kind === "section" && selection.id === section.id;
    const containsActivePage =
      selection.kind === "page" && children.some((page) => page.id === selection.id);
    const isOff = section.toggle && show ? show[section.toggle] === false : false;
    const isDirty = dirtySectionIds.has(section.id);
    const number = numberById.get(section.id);

    return (
      <div key={section.id}>
        <div
          className={cn(
            "relative flex min-h-[40px] items-center gap-1 rounded-lg pr-2 transition-colors",
            isSelected
              ? "bg-primary/5 font-medium text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-full before:bg-primary"
              : containsActivePage
                ? "text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          {children.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="admin-icon"
              onClick={() => toggleGroup(section.id)}
              aria-expanded={isOpen}
              aria-label={isOpen ? `Thu gọn ${section.label}` : `Mở ${section.label}`}
              className="ml-1 h-6 w-6 shrink-0 rounded-md text-muted-foreground hover:bg-accent/70"
            >
              <ChevronRight
                aria-hidden="true"
                className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")}
              />
            </Button>
          ) : (
            <span aria-hidden="true" className="ml-1 w-6 shrink-0" />
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={() => onSelectSection(section.id)}
            aria-current={isSelected ? "true" : undefined}
            aria-label={section.label}
            className="h-auto min-w-0 flex-1 justify-start gap-2 self-stretch rounded-lg px-1 py-2 text-left text-inherit [font-weight:inherit] hover:bg-transparent hover:text-inherit"
          >
            {number !== undefined && (
              <span className="w-4 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {number}.
              </span>
            )}
            {children.length > 0 && (
              <Layers
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80"
              />
            )}
            <span
              className={cn(
                "truncate text-[13px]",
                isOff && "text-muted-foreground line-through opacity-60",
              )}
            >
              {section.label}
            </span>
          </Button>

          <span className="flex shrink-0 items-center gap-1">
            {isDirty && (
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-gold"
                aria-label="Có thay đổi chưa lưu"
              />
            )}
            {section.toggle && show && onToggle && (
              <Switch
                checked={show[section.toggle] ?? true}
                onCheckedChange={(v) => onToggle(section.toggle!, v)}
                aria-label={`Hiện mục ${section.label} trên trang chủ`}
              />
            )}
          </span>
        </div>

        {children.length > 0 && isOpen && (
          <div className="ml-6 space-y-0.5 border-l border-border/70 pl-2">
            {children.map((page) => {
              const pageSelected = selection.kind === "page" && selection.id === page.id;
              const pageDirty = dirtyPageIds.has(page.id);
              return (
                <div
                  key={page.id}
                  className={cn(
                    "relative flex min-h-[34px] items-center rounded-md pr-2 transition-colors",
                    pageSelected
                      ? "bg-primary/5 font-medium text-foreground before:absolute before:inset-y-1 before:-left-2 before:w-1 before:rounded-full before:bg-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onSelectPage(page.id)}
                    aria-current={pageSelected ? "true" : undefined}
                    aria-label={page.label}
                    className="h-auto min-w-0 flex-1 justify-start gap-1.5 self-stretch rounded-md px-1.5 py-1.5 text-left text-inherit [font-weight:inherit] hover:bg-transparent hover:text-inherit"
                  >
                    <span aria-hidden="true" className="shrink-0 text-muted-foreground/50">
                      └
                    </span>
                    <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                    <span className="truncate text-xs">{page.label}</span>
                    {pageDirty && (
                      <span
                        className="ml-auto inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                        aria-label="Trang có thay đổi chưa lưu"
                      />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const selectValue = selection.kind === "section" ? `s:${selection.id}` : `p:${selection.id}`;

  return (
    <div>
      {/* Mobile (< lg): chọn Section hoặc trang con trong một Select có nhóm */}
      <div className="lg:hidden">
        <label
          htmlFor="content-section-select"
          className="mb-1.5 block text-xs font-semibold text-muted-foreground"
        >
          Nội dung trang chủ
        </label>
        <Select
          value={selectValue}
          onValueChange={(value) => {
            const [kind, id] = value.split(":");
            if (!id) return;
            if (kind === "s") onSelectSection(id);
            else onSelectPage(id);
          }}
        >
          <SelectTrigger id="content-section-select" className="w-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => {
              const number = numberById.get(section.id);
              const children = pagesBySection.get(section.id) ?? [];
              return (
                <Fragment key={section.id}>
                  <SelectItem value={`s:${section.id}`}>
                    {number !== undefined ? `${number}. ${section.label}` : section.label}
                    {dirtySectionIds.has(section.id) ? " •" : ""}
                  </SelectItem>
                  {children.map((page) => (
                    <SelectItem key={page.id} value={`p:${page.id}`}>
                      <span aria-hidden className="pl-4 text-muted-foreground/60">
                        └
                      </span>
                      <span>{page.label}</span>
                      {dirtyPageIds.has(page.id) ? " •" : ""}
                    </SelectItem>
                  ))}
                </Fragment>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop (>= lg): cây Section → Navigation Page */}
      <div className="hidden rounded-xl border border-border bg-card p-2 lg:block">
        <div className="px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          8 mục trên trang chủ
        </div>
        <div className="space-y-0.5">{mainSections.map((section) => row(section))}</div>

        {auxiliarySections.length > 0 && (
          <div className="mt-2 border-t border-dashed border-border pt-2">
            <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Khối phụ trợ
            </div>
            <div className="space-y-0.5">{auxiliarySections.map((section) => row(section))}</div>
          </div>
        )}
      </div>
    </div>
  );
}
