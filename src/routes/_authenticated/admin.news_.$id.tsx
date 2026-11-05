import { createFileRoute, Link, useNavigate, useBlocker } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Check, Save, Send, Trash2, Undo2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/programs";
import { NEWS_CATEGORIES } from "@/lib/data/news";
import {
  NEWS_BUCKET,
  NEWS_STATUS_LABEL,
  fmtDate,
  withCovers,
  type NewsRow,
  type NewsStatus,
} from "@/lib/news-db";
import { canReviewNews } from "@/lib/admin-permissions";
import { useAdminAccess } from "./admin";
import { useConfirm } from "@/components/admin/Trash";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/site/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/news_/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Soạn bài | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: NewsEditorPage,
});

type FormState = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  cover_path: string;
};

const EMPTY: FormState = {
  title: "",
  slug: "",
  summary: "",
  content: "",
  category: NEWS_CATEGORIES[0] ?? "Tin tức",
  cover_path: "",
};

const TONE: Record<NewsStatus, string> = {
  draft: "bg-secondary text-secondary-foreground",
  pending_review: "bg-gold/20 text-primary-deep",
  needs_revision: "bg-destructive/15 text-destructive",
  published: "bg-primary/15 text-primary",
  archived: "bg-muted text-muted-foreground",
};

function NewsEditorPage() {
  const { id } = Route.useParams();
  return <NewsEditor key={id} id={id} />;
}

function NewsEditor({ id }: { id: string }) {
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const access = useAdminAccess().data;
  const reviewer = !!access && canReviewNews(access.roles, access.department);
  const { confirm, dialog } = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [baseline, setBaseline] = useState<FormState>(EMPTY);
  const [reviewNote, setReviewNote] = useState<string>("");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(isNew);
  const skipBlock = useRef(false);
  const objectUrlRef = useRef<string | null>(null);

  const articleQuery = useQuery({
    queryKey: ["admin-news-article", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error || !data) return null;
      const rows = await withCovers([data as NewsRow]);
      return rows[0] ?? null;
    },
  });

  const row = articleQuery.data ?? null;

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isNew) {
      setForm(EMPTY);
      setBaseline(EMPTY);
      setCoverPreviewUrl("");
      setSlugTouched(false);
      setInitialized(true);
      return;
    }

    if (row && !initialized) {
      const initialForm: FormState = {
        title: row.title ?? "",
        slug: row.slug ?? "",
        summary: row.summary ?? "",
        content: row.content ?? "",
        category: row.category ?? NEWS_CATEGORIES[0] ?? "Tin tức",
        cover_path: row.cover_path ?? "",
      };
      setForm(initialForm);
      setBaseline(initialForm);
      setCoverPreviewUrl(row.cover ?? "");
      setReviewNote(row.review_note ?? "");
      setSlugTouched(true);
      setInitialized(true);
    }
  }, [isNew, row, initialized]);

  const editable =
    isNew || reviewer || ["draft", "pending_review", "needs_revision"].includes(row?.status ?? "");
  const canDelete = !isNew && row && (reviewer || row.status === "draft");
  const dirty =
    JSON.stringify(form) !== JSON.stringify(baseline) ||
    (reviewer && row?.status === "pending_review" && reviewNote !== (row.review_note ?? ""));

  useBlocker({
    shouldBlockFn: async () => {
      if (!dirty || skipBlock.current) return false;
      const ok = await confirm({
        title: "Rời trang khi chưa lưu?",
        description: "Các thay đổi chưa lưu sẽ bị mất.",
        confirmLabel: "Rời trang",
        destructive: true,
      });
      return !ok;
    },
    enableBeforeUnload: () => dirty && !skipBlock.current,
  });

  const persist = async (
    status: NewsStatus,
    extra?: { review_note?: string },
  ): Promise<string | null> => {
    if (form.title.trim().length < 5) {
      toast.error("Tiêu đề tối thiểu 5 ký tự");
      return null;
    }
    if (form.content.trim().length < 20) {
      toast.error("Nội dung quá ngắn");
      return null;
    }
    const cleanSlug = form.slug.trim() || slugify(form.title);
    if (!cleanSlug) {
      toast.error("Đường dẫn (slug) không hợp lệ");
      return null;
    }

    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: cleanSlug,
        summary: form.summary.trim(),
        content: form.content,
        category: form.category,
        cover_path: form.cover_path,
        status,
        ...(extra ?? {}),
      };

      let savedId = id;
      if (isNew) {
        const user = (await supabase.auth.getUser()).data.user;
        const { data, error } = await supabase
          .from("news_articles")
          .insert({
            ...payload,
            author_id: user?.id ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      } else {
        const { error } = await supabase.from("news_articles").update(payload).eq("id", id);
        if (error) throw error;
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-news"] }),
        qc.invalidateQueries({ queryKey: ["public-news"] }),
        qc.invalidateQueries({ queryKey: ["admin-news-article", savedId] }),
      ]);

      const updatedForm: FormState = {
        title: payload.title,
        slug: payload.slug,
        summary: payload.summary,
        content: payload.content,
        category: payload.category,
        cover_path: payload.cover_path,
      };
      setForm(updatedForm);
      setBaseline(updatedForm);

      return savedId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Đường dẫn (slug) đã tồn tại");
      } else {
        toast.error("Không lưu được: " + msg);
      }
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDraftOrPublished = async () => {
    const isCurrentlyPublished = !isNew && row?.status === "published";
    const targetStatus: NewsStatus = isCurrentlyPublished ? "published" : "draft";
    const savedId = await persist(targetStatus);
    if (savedId) {
      toast.success(isCurrentlyPublished ? "Đã lưu thay đổi" : "Đã lưu nháp");
      if (isNew) {
        skipBlock.current = true;
        navigate({
          to: "/admin/news/$id",
          params: { id: savedId },
          replace: true,
        });
      }
    }
  };

  const handleSendReview = async () => {
    const savedId = await persist("pending_review");
    if (savedId) {
      toast.success("Đã gửi bài chờ duyệt");
      skipBlock.current = true;
      navigate({ to: "/admin/news" });
    }
  };

  const handlePublish = async () => {
    const savedId = await persist("published", { review_note: "" });
    if (savedId) {
      toast.success("Đã xuất bản");
      skipBlock.current = true;
      navigate({ to: "/admin/news" });
    }
  };

  const handleRequestRevision = async () => {
    if (!reviewNote.trim()) {
      toast.error("Vui lòng nhập góp ý cho tác giả");
      return;
    }
    const savedId = await persist("needs_revision", { review_note: reviewNote.trim() });
    if (savedId) {
      toast.success("Đã yêu cầu chỉnh sửa");
      skipBlock.current = true;
      navigate({ to: "/admin/news" });
    }
  };

  const handleMoveToTrash = async () => {
    if (!row) return;
    const ok = await confirm({
      title: "Chuyển vào Thùng rác?",
      description: `Bài "${row.title}" sẽ bị ẩn khỏi website. Bạn có thể khôi phục lại trong mục Thùng rác.`,
      confirmLabel: "Chuyển vào Thùng rác",
      destructive: true,
    });
    if (!ok) return;

    setBusy(true);
    try {
      const { error } = await supabase
        .from("news_articles")
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq("id", row.id);
      if (error) throw error;

      toast.success("Đã chuyển vào Thùng rác");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-news"] }),
        qc.invalidateQueries({ queryKey: ["public-news"] }),
      ]);
      skipBlock.current = true;
      navigate({ to: "/admin/news" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Không có quyền hoặc lỗi: " + msg);
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!editable) return;
    const valid = ["image/png", "image/jpeg", "image/webp"];
    if (!valid.includes(file.type)) {
      toast.error("Chỉ chấp nhận ảnh PNG, JPEG hoặc WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh tối đa 5MB");
      return;
    }

    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(NEWS_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (error) throw error;

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const newObjectUrl = URL.createObjectURL(file);
      objectUrlRef.current = newObjectUrl;
      setCoverPreviewUrl(newObjectUrl);
      setForm((f) => ({ ...f, cover_path: path }));
      toast.success("Đã tải ảnh bìa");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Tải ảnh thất bại: " + msg);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveCover = () => {
    if (!editable) return;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setCoverPreviewUrl("");
    setForm((f) => ({ ...f, cover_path: "" }));
  };

  // Header actions according to role & status
  const currentStatus: NewsStatus = isNew ? "draft" : (row?.status ?? "draft");

  const renderHeaderActions = () => {
    if (!editable) return null;

    if (currentStatus === "published") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={handleSaveDraftOrPublished}
          title="Lưu thay đổi"
          className="disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          <span>Lưu thay đổi</span>
        </button>
      );
    }

    if (currentStatus === "pending_review") {
      if (reviewer) {
        return (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={handleSaveDraftOrPublished}
              title="Lưu nháp"
              className="!border-border !bg-secondary !text-secondary-foreground hover:!bg-accent disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Lưu nháp</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handlePublish}
              title="Duyệt & xuất bản"
              className="disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Duyệt & xuất bản</span>
            </button>
          </>
        );
      }
      return (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={handleSaveDraftOrPublished}
            title="Lưu nháp"
            className="!border-border !bg-secondary !text-secondary-foreground hover:!bg-accent disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Lưu nháp</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSendReview}
            title="Gửi duyệt"
            className="disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Gửi duyệt</span>
          </button>
        </>
      );
    }

    // new / draft / needs_revision / archived
    return (
      <>
        <button
          type="button"
          disabled={busy}
          onClick={handleSaveDraftOrPublished}
          title="Lưu nháp"
          className="!border-border !bg-secondary !text-secondary-foreground hover:!bg-accent disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          <span>Lưu nháp</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleSendReview}
          title="Gửi duyệt"
          className="!bg-primary/90 !text-primary-foreground hover:!opacity-90 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Gửi duyệt</span>
        </button>
        {reviewer && (
          <button
            type="button"
            disabled={busy}
            onClick={handlePublish}
            title="Duyệt & xuất bản"
            className="disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Duyệt & xuất bản</span>
          </button>
        )}
      </>
    );
  };

  if (!isNew && articleQuery.isLoading) {
    return <p className="p-16 text-center text-muted-foreground">Đang tải…</p>;
  }

  if (!isNew && !articleQuery.isLoading && !row) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-3 pb-8 sm:px-6 sm:pt-4">
        <div className="mx-auto max-w-3xl py-20 text-center">
          <EmptyState
            title="Không tìm thấy bài viết"
            desc="Bài viết không tồn tại hoặc bạn không có quyền xem."
          />
          <div className="mt-6">
            <Link
              to="/admin/news"
              className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Tin tức
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-8 sm:px-6 sm:pt-4">
      {dialog}
      <AdminPageHeader
        actions={renderHeaderActions()}
        crumbs={[isNew ? "Viết bài mới" : row?.title?.trim() || "Sửa bài viết"]}
      />

      {/* Top bar: Back link, status badge, and mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/news"
            aria-label="Quay lại danh sách tin tức"
            title="Quay lại danh sách"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border/60 bg-card text-muted-foreground shadow-2xs transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
              TONE[currentStatus] ?? TONE.draft
            }`}
          >
            {NEWS_STATUS_LABEL[currentStatus] ?? "Nháp"}
          </span>
        </div>

        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              mode === "edit"
                ? "bg-background font-semibold text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Soạn
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              mode === "preview"
                ? "bg-background font-semibold text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Xem trước
          </button>
        </div>
      </div>

      {mode === "preview" ? (
        <article className="mx-auto max-w-3xl px-4 py-8 md:px-6">
          <div className="text-sm font-semibold text-primary">{form.category}</div>
          <h1 className="mt-2 text-3xl font-bold text-primary-deep md:text-4xl">
            {form.title || "Tiêu đề bài viết"}
          </h1>
          <div className="mt-2 text-sm text-muted-foreground">
            {row?.author_name || access?.name || "Tác giả"} ·{" "}
            {row?.published_at ? fmtDate(row.published_at) : "Chưa xuất bản"}
          </div>
          {coverPreviewUrl && (
            <img
              src={coverPreviewUrl}
              alt={form.title || "Ảnh bìa"}
              className="mt-6 max-h-96 w-full rounded-3xl object-cover"
            />
          )}
          {form.summary && <p className="mt-6 text-lg font-medium">{form.summary}</p>}
          <div className="mt-4 space-y-4 whitespace-pre-line leading-relaxed text-muted-foreground">
            {form.content ? (
              form.content.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p className="italic text-muted-foreground/60">(Nội dung bài viết chưa có)</p>
            )}
          </div>
        </article>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          {/* Cột soạn (Trái) */}
          <div className="space-y-5">
            {!editable && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-sm text-amber-900 dark:text-amber-200">
                {row?.status === "archived"
                  ? "Bài đã lưu trữ. Chỉ Trưởng/Phó Ban Truyền thông hoặc admin được chỉnh sửa."
                  : "Bài đã xuất bản. Chỉ Trưởng/Phó Ban Truyền thông hoặc admin được chỉnh sửa."}
              </div>
            )}

            {row?.status === "needs_revision" && row.review_note && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-semibold">Góp ý của người duyệt:</p>
                <p className="mt-1 whitespace-pre-line">{row.review_note}</p>
              </div>
            )}

            <input
              type="text"
              disabled={!editable}
              placeholder="Tiêu đề bài viết"
              value={form.title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setForm((f) => ({
                  ...f,
                  title: newTitle,
                  slug: isNew && !slugTouched ? slugify(newTitle) : f.slug,
                }));
              }}
              className="w-full border-b border-border/40 bg-transparent pb-2 text-2xl font-bold placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none disabled:opacity-60 md:text-3xl"
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <label htmlFor="news-summary" className="font-medium">
                  Tóm tắt
                </label>
                <span
                  className={
                    form.summary.length > 200
                      ? "font-semibold text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  {form.summary.length}/200
                </span>
              </div>
              <textarea
                id="news-summary"
                rows={3}
                disabled={!editable}
                placeholder="Tóm tắt ngắn gọn nội dung bài viết..."
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                className="w-full resize-y rounded-xl border border-input bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="news-content" className="text-xs font-medium text-muted-foreground">
                Nội dung
              </label>
              <textarea
                id="news-content"
                rows={16}
                disabled={!editable}
                placeholder="Nội dung bài viết..."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                style={{ fieldSizing: "content" } as React.CSSProperties}
                className="min-h-[420px] w-full resize-y rounded-xl border border-input bg-background p-3.5 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
              />
              <p className="text-xs text-muted-foreground">Cách một dòng trống giữa các đoạn.</p>
            </div>
          </div>

          {/* Cột bên (Phải: 340px, sticky top-4) */}
          <aside className="space-y-5 self-start lg:sticky lg:top-4">
            {/* 1. Ảnh bìa */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Ảnh bìa</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadFile(file);
                  e.target.value = "";
                }}
              />

              {coverPreviewUrl ? (
                <div className="space-y-2">
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-muted">
                    <img
                      src={coverPreviewUrl}
                      alt="Ảnh bìa"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {editable && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Đổi ảnh
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleRemoveCover}
                        className="inline-flex items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Gỡ ảnh
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (editable) setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleUploadFile(file);
                  }}
                  onClick={() => {
                    if (editable) fileInputRef.current?.click();
                  }}
                  className={`flex aspect-[16/10] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border/80 hover:border-primary/50 hover:bg-accent/40"
                  } ${editable ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                >
                  <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">
                    Kéo thả ảnh vào đây hoặc bấm để chọn ảnh
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">PNG, JPEG, WebP ≤ 5MB</p>
                </div>
              )}
            </div>

            {/* 2. Chuyên mục */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Chuyên mục</label>
              <Select
                disabled={!editable}
                value={form.category}
                onValueChange={(val) => setForm((f) => ({ ...f, category: val }))}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-input bg-background text-sm">
                  <SelectValue placeholder="Chọn chuyên mục" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {NEWS_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Đường dẫn */}
            <div className="space-y-1.5">
              <label htmlFor="news-slug" className="text-xs font-medium text-muted-foreground">
                Đường dẫn
              </label>
              <div className="flex items-center overflow-hidden rounded-lg border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                <span className="select-none border-r border-input bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                  /news/
                </span>
                <input
                  id="news-slug"
                  type="text"
                  disabled={!editable}
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                  }}
                  placeholder="duong-dan-bai-viet"
                  className="h-9 w-full bg-transparent px-3 py-1.5 text-sm focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            {/* 4. Thông tin bài viết */}
            {!isNew && row && (
              <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-xs">
                <h3 className="font-semibold text-foreground">Thông tin</h3>
                <dl className="grid grid-cols-[80px_1fr] gap-y-1.5 text-muted-foreground">
                  <dt>Tác giả</dt>
                  <dd className="font-medium text-foreground">{row.author_name || "—"}</dd>
                  <dt>Tạo lúc</dt>
                  <dd>{fmtDate(row.created_at) || "—"}</dd>
                  <dt>Cập nhật</dt>
                  <dd>{fmtDate(row.updated_at) || "—"}</dd>
                  <dt>Xuất bản</dt>
                  <dd>{row.published_at ? fmtDate(row.published_at) : "Chưa xuất bản"}</dd>
                  <dt>Người duyệt</dt>
                  <dd className="font-medium text-foreground">{row.reviewer_name || "—"}</dd>
                </dl>
              </div>
            )}

            {/* 5. Khối duyệt bài (reviewer && pending_review) */}
            {reviewer && row?.status === "pending_review" && (
              <div className="space-y-3 rounded-2xl border border-gold/40 bg-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary-deep">
                  Duyệt bài viết
                </h3>
                <div className="space-y-1.5">
                  <label htmlFor="review-note" className="text-xs text-muted-foreground">
                    Góp ý cho tác giả
                  </label>
                  <textarea
                    id="review-note"
                    rows={3}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Nội dung cần chỉnh sửa, góp ý..."
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleRequestRevision}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Yêu cầu chỉnh sửa
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handlePublish}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Duyệt & xuất bản
                  </button>
                </div>
              </div>
            )}

            {/* 6. Danger zone */}
            {canDelete && (
              <div className="space-y-3 rounded-2xl border border-destructive/30 bg-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-destructive">
                  Khu vực nguy hiểm
                </h3>
                <p className="text-xs text-muted-foreground">
                  Bài viết sẽ bị ẩn khỏi website và chuyển vào Thùng rác.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleMoveToTrash}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Chuyển vào thùng rác
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
