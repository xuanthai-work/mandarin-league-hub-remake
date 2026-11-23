import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type ContentKey, type HomeContent, type SiteSettings } from "@/lib/site-content";
import {
  HOME_BLOCKS,
  HOME_SECTIONS,
  NAV_PAGES,
  SITE_BLOCKS,
  blocksOfSection,
  changedKeys,
  describeChanges,
  fieldError,
  findNavPage,
  toHomeForm,
  toSiteForm,
  type ContentBlock,
} from "@/lib/site-content-fields";
import { useConfirm } from "@/components/admin/Trash";
import { can } from "@/lib/permission-catalog";
import { useAdminAccess } from "./admin";
import type { Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SectionOutline, type ContentSelection } from "@/components/admin/content/SectionOutline";
import { ContentBlockCard } from "@/components/admin/content/ContentBlockCard";
import { NavPageEditor } from "@/components/admin/content/NavPageEditor";
import { PublishDialog } from "@/components/admin/content/PublishDialog";
import { ContentHistory } from "@/components/admin/content/ContentHistory";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
export const Route = createFileRoute("/_authenticated/admin/content")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Trang & Nội dung | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: ContentAdmin,
});

function useRow(key: ContentKey) {
  return useQuery({
    queryKey: ["admin-content", key],
    queryFn: async () =>
      (await supabase.from("site_content").select("*").eq("key", key).maybeSingle()).data,
  });
}

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English (EN)" },
  { value: "zh", label: "中文 (ZH)" },
];

type Tab = "home" | "site" | "log";

/** Text fields are stored per language; link fields and section toggles are shared. */
function valueKeys(kind: string, key: string): string[] {
  return kind === "text" || kind === "area" ? [key, `${key}_en`, `${key}_zh`] : [key];
}

function isDirtyBlock(
  block: ContentBlock<string>,
  form: Record<string, unknown>,
  saved: Record<string, unknown>,
): boolean {
  const showForm = (form["show"] ?? {}) as Record<string, boolean>;
  const showSaved = (saved["show"] ?? {}) as Record<string, boolean>;
  if (block.toggle && showForm[block.toggle] !== showSaved[block.toggle]) return true;
  return block.fields.some((field) =>
    valueKeys(field.kind, field.key).some(
      (key) =>
        ((form[key] as string | undefined) ?? "").trim() !==
        ((saved[key] as string | undefined) ?? "").trim(),
    ),
  );
}

function ContentAdmin() {
  const [tab, setTab] = useState<Tab>("home");
  const [editLang, setEditLang] = useState<Lang>("vi");
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const access = useAdminAccess();
  const mayPublish = !!access.data && can(access.data.perms, "content.publish");

  const homeRow = useRow("home");
  const siteRow = useRow("site");

  const [selection, setSelection] = useState<ContentSelection>(() => ({
    kind: "section",
    id: HOME_SECTIONS[0]?.id ?? "hero",
  }));

  const [homeForm, setHomeForm] = useState<HomeContent>(() => toHomeForm({}));
  const [siteForm, setSiteForm] = useState<SiteSettings>(() => toSiteForm({}));
  const [busy, setBusy] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const homeSaved = useMemo(() => toHomeForm(homeRow.data?.draft), [homeRow.data?.draft]);
  const siteSaved = useMemo(() => toSiteForm(siteRow.data?.draft), [siteRow.data?.draft]);

  const prevHomeSavedRef = useRef<HomeContent | null>(null);
  const prevSiteSavedRef = useRef<SiteSettings | null>(null);

  useEffect(() => {
    if (homeRow.data !== undefined) {
      const newSaved = toHomeForm(homeRow.data?.draft);
      if (!prevHomeSavedRef.current) {
        setHomeForm(newSaved);
      } else {
        const isDirty = changedKeys(homeForm, prevHomeSavedRef.current).length > 0;
        if (!isDirty) {
          setHomeForm(newSaved);
        }
      }
      prevHomeSavedRef.current = newSaved;
    }
  }, [homeRow.data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (siteRow.data !== undefined) {
      const newSaved = toSiteForm(siteRow.data?.draft);
      if (!prevSiteSavedRef.current) {
        setSiteForm(newSaved);
      } else {
        const isDirty = changedKeys(siteForm, prevSiteSavedRef.current).length > 0;
        if (!isDirty) {
          setSiteForm(newSaved);
        }
      }
      prevSiteSavedRef.current = newSaved;
    }
  }, [siteRow.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const unsavedHome = useMemo(() => changedKeys(homeForm, homeSaved).length, [homeForm, homeSaved]);
  const unsavedSite = useMemo(() => changedKeys(siteForm, siteSaved).length, [siteForm, siteSaved]);
  const unsavedTotal = unsavedHome + unsavedSite;

  const homeDirtyBlocks = useMemo(() => {
    const ids = new Set<string>();
    for (const block of HOME_BLOCKS) {
      if (isDirtyBlock(block, homeForm, homeSaved)) ids.add(block.id);
    }
    return ids;
  }, [homeForm, homeSaved]);

  const homeDirtySections = useMemo(() => {
    const ids = new Set<string>();
    for (const section of HOME_SECTIONS) {
      if (section.toggle && homeForm.show[section.toggle] !== homeSaved.show[section.toggle]) {
        ids.add(section.id);
      }
      if (blocksOfSection(section.id).some((block) => homeDirtyBlocks.has(block.id))) {
        ids.add(section.id);
      }
    }
    return ids;
  }, [homeForm.show, homeSaved.show, homeDirtyBlocks]);

  const navDirtyPages = useMemo(() => {
    const ids = new Set<string>();
    for (const page of NAV_PAGES) {
      if (isDirtyBlock(page, homeForm, homeSaved)) ids.add(page.id);
    }
    return ids;
  }, [homeForm, homeSaved]);

  const siteDirtyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const block of SITE_BLOCKS) {
      if (isDirtyBlock(block, siteForm, siteSaved)) ids.add(block.id);
    }
    return ids;
  }, [siteForm, siteSaved]);

  const homeErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    for (const block of [...HOME_BLOCKS, ...NAV_PAGES]) {
      for (const field of block.fields) {
        const err = fieldError(field.kind, homeForm[field.key] ?? "");
        if (err) errs[field.key] = err;
      }
    }
    return errs;
  }, [homeForm]);

  const siteErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    for (const block of SITE_BLOCKS) {
      for (const field of block.fields) {
        const err = fieldError(field.kind, siteForm[field.key] ?? "");
        if (err) errs[field.key] = err;
      }
    }
    return errs;
  }, [siteForm]);

  useBlocker({
    shouldBlockFn: async () => {
      if (unsavedTotal === 0) return false;
      const ok = await confirm({
        title: "Rời trang khi chưa lưu?",
        description: "Các thay đổi chưa lưu sẽ bị mất.",
        confirmLabel: "Rời trang",
        destructive: true,
      });
      return !ok;
    },
    enableBeforeUnload: () => unsavedTotal > 0,
  });

  const persist = async (targetKey: "home" | "site", publish: boolean): Promise<boolean> => {
    const errs = targetKey === "home" ? homeErrors : siteErrors;
    if (Object.keys(errs).length > 0) {
      toast.error("Vui lòng sửa các ô bị lỗi trước khi lưu");
      return false;
    }

    setBusy(true);
    const form = targetKey === "home" ? homeForm : siteForm;
    const row = targetKey === "home" ? homeRow : siteRow;
    const payload = {
      key: targetKey,
      draft: form as never,
      ...(publish ? { published: form as never, published_at: new Date().toISOString() } : {}),
    };
    const { error } = row.data
      ? await supabase.from("site_content").update(payload).eq("key", targetKey)
      : await supabase.from("site_content").insert(payload);
    setBusy(false);

    if (error) {
      toast.error(
        "Không lưu được (cần quyền Admin hoặc Trưởng/Phó Ban Truyền thông): " + error.message,
      );
      return false;
    }

    toast.success(publish ? "Đã xuất bản lên website" : "Đã lưu nháp");

    if (targetKey === "home") {
      prevHomeSavedRef.current = form as HomeContent;
    } else {
      prevSiteSavedRef.current = form as SiteSettings;
    }

    qc.setQueryData(["admin-content", targetKey], (old: unknown) => ({
      ...((old as object) ?? {}),
      draft: form,
      ...(publish ? { published: form, published_at: payload.published_at } : {}),
    }));
    qc.invalidateQueries({ queryKey: ["admin-content", targetKey] });
    qc.invalidateQueries({ queryKey: ["site-content", targetKey] });
    qc.invalidateQueries({ queryKey: ["content-audit"] });
    return true;
  };

  const currentKey: "home" | "site" = tab === "site" ? "site" : "home";

  const handlePreview = async () => {
    const currentErrors = currentKey === "home" ? homeErrors : siteErrors;
    const currentUnsaved = currentKey === "home" ? unsavedHome : unsavedSite;

    const w = window.open("about:blank", "_blank");

    if (Object.keys(currentErrors).length > 0) {
      w?.close();
      toast.error("Sửa các ô bị lỗi trước khi xem trước");
      return;
    }

    if (currentUnsaved > 0) {
      const success = await persist(currentKey, false);
      if (!success) {
        w?.close();
        return;
      }
    }

    if (w) {
      w.location.href = `/?preview=1&lang=${editLang}`;
    } else {
      window.open(`/?preview=1&lang=${editLang}`, "_blank");
    }
  };

  const handleRestore = async (key: "home" | "site", data: unknown) => {
    const unsaved = key === "home" ? unsavedHome : unsavedSite;
    if (unsaved > 0) {
      const ok = await confirm({
        title: "Thay thế thay đổi chưa lưu?",
        description: `Mục này đang có ${unsaved} thay đổi chưa lưu. Nạp bản cũ sẽ ghi đè chúng.`,
        confirmLabel: "Nạp bản cũ",
        destructive: true,
      });
      if (!ok) return;
    }
    if (key === "home") setHomeForm(toHomeForm(data));
    else setSiteForm(toSiteForm(data));
    setTab(key === "home" ? "home" : "site");
    toast.success("Đã nạp bản cũ vào trình sửa. Kiểm tra rồi bấm Lưu nháp hoặc Xuất bản.");
  };

  const currentRow = currentKey === "home" ? homeRow : siteRow;
  const currentErrors = currentKey === "home" ? homeErrors : siteErrors;
  const currentUnsaved = currentKey === "home" ? unsavedHome : unsavedSite;
  const draftMatchesPublished =
    changedKeys(
      (currentRow.data?.draft as Record<string, unknown>) ?? {},
      (currentRow.data?.published as Record<string, unknown>) ?? {},
    ).length === 0;
  const hasNothingToPublish = currentUnsaved === 0 && draftMatchesPublished;
  const canPublish =
    !busy && Object.keys(currentErrors).length === 0 && !hasNothingToPublish && mayPublish;
  const canSaveDraft = !busy && currentUnsaved > 0 && Object.keys(currentErrors).length === 0;

  const publishChanges = useMemo(() => {
    if (tab === "log") return [];
    if (currentKey === "site") {
      return describeChanges("site", currentRow.data?.published, siteForm);
    }
    return describeChanges("home", currentRow.data?.published, homeForm);
  }, [tab, currentKey, currentRow.data?.published, homeForm, siteForm]);

  const updateHomeField = (key: string, value: string) =>
    setHomeForm((prev) => ({ ...prev, [key]: value }) as HomeContent);
  const updateSiteField = (key: string, value: string) =>
    setSiteForm((prev) => ({ ...prev, [key]: value }) as SiteSettings);
  const toggleHomeSection = (key: keyof HomeContent["show"], value: boolean) =>
    setHomeForm((prev) => ({ ...prev, show: { ...prev.show, [key]: value } }));

  const openNavPage = (pageId: string) => {
    setSelection({ kind: "page", id: pageId });
    window.scrollTo({ top: 0 });
  };

  const selectedPage = selection.kind === "page" ? findNavPage(selection.id) : undefined;
  const activeSection =
    HOME_SECTIONS.find(
      (section) =>
        section.id === (selection.kind === "section" ? selection.id : selectedPage?.sectionId),
    ) ?? HOME_SECTIONS[0]!;
  const sectionBlocks = blocksOfSection(activeSection.id);
  const isSectionOff = activeSection.toggle ? homeForm.show[activeSection.toggle] === false : false;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      {dialog}

      <PublishDialog
        open={publishOpen}
        changes={publishChanges}
        busy={busy}
        onCancel={() => setPublishOpen(false)}
        onConfirm={async () => {
          const ok = await persist(currentKey, true);
          if (ok) setPublishOpen(false);
        }}
      />

      <div className="space-y-4">
        {/* Tabs with horizontal scrollbar on small screens */}
        <div className="custom-scrollbar max-w-full overflow-x-auto">
          <SegmentedControl
            label="Mục nội dung"
            value={tab}
            onChange={(value) => setTab(value as Tab)}
            options={(
              [
                ["home", "Trang chủ", unsavedHome > 0],
                ["site", "Liên hệ & Chân trang", unsavedSite > 0],
                ["log", "Lịch sử thay đổi", false],
              ] as const
            ).map(([k, label, isDirty]) => ({
              value: k,
              label: (
                <span className="flex items-center gap-1.5">
                  <span>{label}</span>
                  {isDirty && (
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full bg-gold"
                      aria-label="Có thay đổi chưa lưu"
                    />
                  )}
                </span>
              ),
            }))}
          />
        </div>

        {tab !== "log" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Ngôn ngữ nội dung</span>
            <SegmentedControl
              label="Ngôn ngữ nội dung"
              value={editLang}
              onChange={setEditLang}
              options={LANG_OPTIONS}
            />
          </div>
        )}

        {/* Status Line + Action Buttons */}
        {tab !== "log" && (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                {currentUnsaved > 0 ? (
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-gold"
                      aria-hidden="true"
                    />
                    <span>{currentUnsaved} thay đổi chưa lưu</span>
                  </span>
                ) : !draftMatchesPublished ? (
                  <span className="font-medium text-gold">Đã lưu nháp · chưa xuất bản</span>
                ) : (
                  <span className="text-muted-foreground">Website đang hiển thị bản mới nhất</span>
                )}

                <span className="text-muted-foreground">
                  {currentRow.data?.published_at
                    ? `· Xuất bản lần cuối ${new Date(currentRow.data.published_at).toLocaleString("vi-VN")}`
                    : "· Chưa xuất bản lần nào"}
                </span>
              </div>
              <p className="max-w-3xl text-xs text-muted-foreground">
                Ô để trống sẽ dùng nội dung mặc định. Liên kết và bật/tắt hiển thị dùng chung cho cả
                3 ngôn ngữ.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={busy}
              >
                <ExternalLink className="h-4 w-4" /> Xem trước
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => persist(currentKey, false)}
                disabled={!canSaveDraft}
              >
                <Save className="h-4 w-4" /> Lưu nháp
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setPublishOpen(true)}
                disabled={!canPublish}
                title={
                  mayPublish
                    ? undefined
                    : "Chỉ người có quyền xuất bản mới đưa thay đổi lên website"
                }
              >
                <Send className="h-4 w-4" /> Xuất bản
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Trang chủ: cây Section → Navigation Page; bên phải là panel của mục đang chọn */}
      {tab === "home" &&
        (homeRow.isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <div className="self-start lg:sticky lg:top-4 lg:w-72">
              <SectionOutline
                sections={HOME_SECTIONS}
                navPages={NAV_PAGES}
                selection={selection}
                onSelectSection={(id) => setSelection({ kind: "section", id })}
                onSelectPage={openNavPage}
                show={homeForm.show}
                onToggle={toggleHomeSection}
                dirtySectionIds={homeDirtySections}
                dirtyPageIds={navDirtyPages}
              />
            </div>

            {selection.kind === "page" && selectedPage ? (
              <NavPageEditor
                page={selectedPage}
                section={HOME_SECTIONS.find((section) => section.id === selectedPage.sectionId)}
                lang={editLang}
                form={homeForm as unknown as Record<string, unknown>}
                saved={homeSaved as unknown as Record<string, unknown>}
                onFieldChange={updateHomeField}
                errors={homeErrors}
                onBackToSection={() =>
                  setSelection({ kind: "section", id: selectedPage.sectionId })
                }
              />
            ) : (
              <div className="min-w-0 space-y-4">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <h1 className="text-lg font-bold text-primary-deep">{activeSection.label}</h1>
                  {activeSection.toggle && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Hiện trên trang chủ</span>
                      <Switch
                        checked={homeForm.show[activeSection.toggle] ?? true}
                        onCheckedChange={(value) => toggleHomeSection(activeSection.toggle!, value)}
                        aria-label={`Hiện mục ${activeSection.label}`}
                      />
                    </div>
                  )}
                </header>

                {isSectionOff && (
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Mục này đang ẩn trên trang chủ. Nội dung bên dưới vẫn được lưu cho lần bật lại.
                  </div>
                )}

                {sectionBlocks.map((block, index) => (
                  <ContentBlockCard
                    key={block.id}
                    block={block}
                    index={index + 1}
                    lang={editLang}
                    form={homeForm as unknown as Record<string, unknown>}
                    saved={homeSaved as unknown as Record<string, unknown>}
                    onFieldChange={updateHomeField}
                    errors={homeErrors}
                    dirty={homeDirtyBlocks.has(block.id)}
                    show={homeForm.show}
                    onToggle={toggleHomeSection}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

      {/* Liên hệ & Chân trang */}
      {tab === "site" &&
        (siteRow.isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : (
          <div className="min-w-0 space-y-4">
            <header className="border-b border-border pb-3">
              <h1 className="text-lg font-bold text-primary-deep">Liên hệ & Chân trang</h1>
            </header>

            {SITE_BLOCKS.map((block, index) => (
              <ContentBlockCard
                key={block.id}
                block={block as unknown as ContentBlock<string>}
                index={index + 1}
                lang={editLang}
                form={siteForm as unknown as Record<string, unknown>}
                saved={siteSaved as unknown as Record<string, unknown>}
                onFieldChange={updateSiteField}
                errors={siteErrors}
                dirty={siteDirtyIds.has(block.id)}
              />
            ))}
          </div>
        ))}

      {tab === "log" && <ContentHistory onRestore={handleRestore} />}
    </div>
  );
}
