import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, ExternalLink, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  type ContentKey,
  type HomeContent,
  type HomeSectionKey,
  type SiteSettings,
} from "@/lib/site-content";
import {
  HOME_BLOCKS,
  SITE_BLOCKS,
  changedKeys,
  fieldError,
  toHomeForm,
  toSiteForm,
  type ContentBlock,
  type HomeTextKey,
  type SiteKey,
} from "@/lib/site-content-fields";
import { useConfirm } from "@/components/admin/Trash";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ContentOutline } from "@/components/admin/content/ContentOutline";
import { ContentFieldInput } from "@/components/admin/content/ContentFieldInput";

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

function ContentAdmin() {
  const [tab, setTab] = useState<"home" | "site" | "log">("home");
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();

  const homeRow = useRow("home");
  const siteRow = useRow("site");

  const [activeHomeId, setActiveHomeId] = useState(HOME_BLOCKS[0]?.id ?? "hero");
  const [activeSiteId, setActiveSiteId] = useState(SITE_BLOCKS[0]?.id ?? "contact");

  const [homeForm, setHomeForm] = useState<HomeContent>(() => toHomeForm({}));
  const [siteForm, setSiteForm] = useState<SiteSettings>(() => toSiteForm({}));
  const [busy, setBusy] = useState(false);

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

  const homeDirtyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of HOME_BLOCKS) {
      if (b.toggle && homeForm.show[b.toggle] !== homeSaved.show[b.toggle]) {
        ids.add(b.id);
      }
      for (const f of b.fields) {
        if ((homeForm[f.key] ?? "").trim() !== (homeSaved[f.key] ?? "").trim()) {
          ids.add(b.id);
        }
      }
    }
    return ids;
  }, [homeForm, homeSaved]);

  const siteDirtyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const b of SITE_BLOCKS) {
      for (const f of b.fields) {
        if ((siteForm[f.key] ?? "").trim() !== (siteSaved[f.key] ?? "").trim()) {
          ids.add(b.id);
        }
      }
    }
    return ids;
  }, [siteForm, siteSaved]);

  const homeErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    for (const b of HOME_BLOCKS) {
      for (const f of b.fields) {
        const err = fieldError(f.kind, homeForm[f.key] ?? "");
        if (err) errs[f.key] = err;
      }
    }
    return errs;
  }, [homeForm]);

  const siteErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    for (const b of SITE_BLOCKS) {
      for (const f of b.fields) {
        const err = fieldError(f.kind, siteForm[f.key] ?? "");
        if (err) errs[f.key] = err;
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

  const save = async (targetKey: "home" | "site", publish: boolean): Promise<boolean> => {
    const errs = targetKey === "home" ? homeErrors : siteErrors;
    if (Object.keys(errs).length > 0) {
      toast.error("Vui lòng sửa các ô bị lỗi trước khi lưu");
      return false;
    }

    if (publish) {
      const ok = await confirm({
        title: "Xuất bản nội dung?",
        description: "Nội dung mới sẽ hiện ngay cho mọi khách truy cập website.",
        confirmLabel: "Xuất bản",
      });
      if (!ok) return false;
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

  const handlePreview = async () => {
    const currentErrors = tab === "home" ? homeErrors : siteErrors;
    const currentUnsaved = tab === "home" ? unsavedHome : unsavedSite;

    const w = window.open("about:blank", "_blank");

    if (Object.keys(currentErrors).length > 0) {
      w?.close();
      toast.error("Sửa các ô bị lỗi trước khi xem trước");
      return;
    }

    if (currentUnsaved > 0) {
      const success = await save(tab as "home" | "site", false);
      if (!success) {
        w?.close();
        return;
      }
    }

    if (w) {
      w.location.href = "/?preview=1";
    } else {
      window.open("/?preview=1", "_blank");
    }
  };

  const currentRow = tab === "home" ? homeRow : siteRow;
  const currentErrors = tab === "home" ? homeErrors : siteErrors;
  const currentUnsaved = tab === "home" ? unsavedHome : unsavedSite;
  const draftMatchesPublished =
    changedKeys(
      (currentRow.data?.draft as Record<string, unknown>) ?? {},
      (currentRow.data?.published as Record<string, unknown>) ?? {},
    ).length === 0;
  const hasNothingToPublish = currentUnsaved === 0 && draftMatchesPublished;
  const canPublish = !busy && Object.keys(currentErrors).length === 0 && !hasNothingToPublish;
  const canSaveDraft = !busy && currentUnsaved > 0 && Object.keys(currentErrors).length === 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      {dialog}

      <div className="space-y-4">
        {/* Tabs with horizontal scrollbar on small screens */}
        <div className="custom-scrollbar max-w-full overflow-x-auto">
          <div className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-muted/60 p-1">
            {(
              [
                ["home", "Trang chủ", unsavedHome > 0],
                ["site", "Liên hệ & Chân trang", unsavedSite > 0],
                ["log", "Lịch sử thay đổi", false],
              ] as const
            ).map(([k, label, isDirty]) => {
              const active = tab === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  aria-pressed={active}
                  className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:px-4 cursor-pointer ${
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="content-tab-pill"
                      className="absolute inset-0 rounded-lg bg-primary shadow-xs"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span>{label}</span>
                    {isDirty && (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-gold"
                        aria-label="Có thay đổi chưa lưu"
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
              <p className="text-xs text-muted-foreground">
                Ô để trống sẽ dùng chữ mặc định. Lưu nháp chỉ người quản trị xem được khi xem trước;
                Xuất bản mới hiện cho khách.
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
                onClick={() => save(tab as "home" | "site", false)}
                disabled={!canSaveDraft}
              >
                <Save className="h-4 w-4" /> Lưu nháp
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => save(tab as "home" | "site", true)}
                disabled={!canPublish}
              >
                <Send className="h-4 w-4" /> Xuất bản
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tab Panels */}
      {tab === "home" &&
        (homeRow.isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : (
          <BlockEditor<HomeTextKey>
            blocks={HOME_BLOCKS}
            activeId={activeHomeId}
            onSelectId={setActiveHomeId}
            title="Cấu trúc Trang chủ"
            form={homeForm}
            saved={homeSaved}
            onFieldChange={(k, v) => setHomeForm((prev) => ({ ...prev, [k]: v }))}
            show={homeForm.show}
            onToggle={(k, v) =>
              setHomeForm((prev) => ({
                ...prev,
                show: { ...prev.show, [k]: v },
              }))
            }
            dirtyIds={homeDirtyIds}
            errors={homeErrors}
          />
        ))}

      {tab === "site" &&
        (siteRow.isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : (
          <BlockEditor<SiteKey>
            blocks={SITE_BLOCKS}
            activeId={activeSiteId}
            onSelectId={setActiveSiteId}
            title="Liên hệ & Chân trang"
            form={siteForm}
            saved={siteSaved}
            onFieldChange={(k, v) => setSiteForm((prev) => ({ ...prev, [k]: v }))}
            dirtyIds={siteDirtyIds}
            errors={siteErrors}
          />
        ))}

      {tab === "log" && <AuditLog />}
    </div>
  );
}

function BlockEditor<K extends string>({
  blocks,
  activeId,
  onSelectId,
  title,
  form,
  saved,
  onFieldChange,
  show,
  onToggle,
  dirtyIds,
  errors,
}: {
  blocks: ContentBlock<K>[];
  activeId: string;
  onSelectId: (id: string) => void;
  title: string;
  form: Record<string, unknown>;
  saved: Record<string, unknown>;
  onFieldChange: (k: K, v: string) => void;
  show?: Record<HomeSectionKey, boolean>;
  onToggle?: (k: HomeSectionKey, v: boolean) => void;
  dirtyIds: Set<string>;
  errors: Record<string, string>;
}) {
  const activeBlock = blocks.find((b) => b.id === activeId) ?? blocks[0]!;
  const isOff = activeBlock.toggle && show ? show[activeBlock.toggle] === false : false;
  const customizedCount = activeBlock.fields.filter(
    (f) => ((form[f.key] as string | undefined) ?? "").trim().length > 0,
  ).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <div className="lg:w-72 lg:sticky lg:top-4 self-start">
        <ContentOutline
          blocks={blocks}
          activeId={activeBlock.id}
          onSelect={onSelectId}
          show={show}
          onToggle={onToggle}
          dirtyIds={dirtyIds}
          title={title}
        />
      </div>

      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-bold text-primary-deep">{activeBlock.label}</h2>
            {activeBlock.fields.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {customizedCount}/{activeBlock.fields.length} ô đã tùy chỉnh
              </span>
            )}
          </div>

          {activeBlock.toggle && show && onToggle && (
            <div className="flex lg:hidden items-center gap-2 text-xs">
              <span className="text-muted-foreground">Hiện trên trang chủ</span>
              <Switch
                checked={show[activeBlock.toggle] ?? true}
                onCheckedChange={(v) => onToggle(activeBlock.toggle!, v)}
                aria-label={`Hiện khối ${activeBlock.label}`}
              />
            </div>
          )}
        </div>

        {isOff && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Khối này đang ẩn trên trang chủ.
          </div>
        )}

        {activeBlock.fields.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
            {activeBlock.note && (
              <p className="text-sm text-muted-foreground">{activeBlock.note}</p>
            )}
            {activeBlock.manage && (
              <div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={activeBlock.manage.to}>
                    Mở trang {activeBlock.manage.label}
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeBlock.fields.map((f) => (
              <div key={f.key} className={f.kind === "area" ? "sm:col-span-2" : undefined}>
                <ContentFieldInput
                  field={f}
                  value={(form[f.key] as string | undefined) ?? ""}
                  onChange={(v) => onFieldChange(f.key, v)}
                  changed={
                    ((form[f.key] as string | undefined) ?? "").trim() !==
                    ((saved[f.key] as string | undefined) ?? "").trim()
                  }
                  error={errors[f.key] ?? null}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditLog() {
  const q = useQuery({
    queryKey: ["content-audit"],
    queryFn: async () =>
      (
        await supabase
          .from("content_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
      ).data ?? [],
  });
  const L: Record<string, string> = {
    create: "Tạo mới",
    save_draft: "Lưu nháp",
    publish: "Xuất bản",
  };
  const K: Record<string, string> = { home: "Trang chủ", site: "Liên hệ & Chân trang" };
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Thời gian</th>
            <th className="p-3">Mục</th>
            <th className="p-3">Thao tác</th>
            <th className="p-3">Người thực hiện</th>
          </tr>
        </thead>
        <tbody>
          {(q.data ?? []).length === 0 && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-muted-foreground">
                Chưa có thay đổi.
              </td>
            </tr>
          )}
          {(q.data ?? []).map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-3 text-xs">{new Date(r.created_at).toLocaleString("vi-VN")}</td>
              <td className="p-3">{K[r.content_key] ?? r.content_key}</td>
              <td className="p-3">{L[r.action] ?? r.action}</td>
              <td className="p-3">{r.actor_name || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
