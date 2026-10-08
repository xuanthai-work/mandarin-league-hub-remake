import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Pencil, Plus, Send, Star, Trash2, Undo2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/programs";
import { NEWS_CATEGORIES } from "@/lib/data/news";
import { NEWS_BUCKET, NEWS_STATUS_LABEL, fmtDate, withCovers, type NewsRow, type NewsStatus } from "@/lib/news-db";
import { canReviewNews } from "@/lib/admin-permissions";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/news")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Tin tức | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: NewsAdmin,
});

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
type Form = { id?: string; title: string; slug: string; summary: string; content: string; category: string; cover_path: string; review_note?: string; status?: NewsStatus };
const EMPTY: Form = { title: "", slug: "", summary: "", content: "", category: NEWS_CATEGORIES[0]!, cover_path: "" };
const TONE: Record<NewsStatus, string> = {
  draft: "bg-secondary", pending_review: "bg-gold/20 text-primary-deep", needs_revision: "bg-destructive/15 text-destructive",
  published: "bg-primary/15 text-primary", archived: "bg-muted text-muted-foreground",
};

function NewsAdmin() {
  const qc = useQueryClient();
  const access = useAdminAccess().data;
  const reviewer = !!access && canReviewNews(access.roles, access.department);
  const [f, setF] = useState<Form | null>(null);
  const [filter, setFilter] = useState<NewsStatus | "">("");
  const [busy, setBusy] = useState(false);

  const list = useQuery({ queryKey: ["admin-news"], queryFn: async () => {
    const { data } = await supabase.from("news_articles").select("*").is("deleted_at", null).order("updated_at", { ascending: false });
    return withCovers((data ?? []) as NewsRow[]);
  } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-news"] }); qc.invalidateQueries({ queryKey: ["public-news"] }); };

  const patch = async (id: string, p: Record<string, unknown>, msg: string) => {
    const { error } = await supabase.from("news_articles").update(p as never).eq("id", id);
    if (error) return void toast.error("Không có quyền hoặc lỗi: " + error.message);
    toast.success(msg); refresh();
  };

  const save = async (status: NewsStatus) => {
    if (!f) return;
    if (f.title.trim().length < 5) return void toast.error("Tiêu đề tối thiểu 5 ký tự");
    if (f.content.trim().length < 20) return void toast.error("Nội dung quá ngắn");
    setBusy(true);
    const row = { title: f.title.trim(), slug: f.slug || slugify(f.title), summary: f.summary.trim(), content: f.content, category: f.category, cover_path: f.cover_path, status };
    const { error } = f.id
      ? await supabase.from("news_articles").update(row).eq("id", f.id)
      : await supabase.from("news_articles").insert({ ...row, author_id: (await supabase.auth.getUser()).data.user?.id ?? null });
    setBusy(false);
    if (error) return void toast.error(error.message.includes("duplicate") ? "Đường dẫn (slug) đã tồn tại" : "Không lưu được: " + error.message);
    toast.success(status === "pending_review" ? "Đã gửi bài chờ duyệt" : status === "published" ? "Đã xuất bản" : "Đã lưu nháp");
    setF(null); refresh();
  };

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return void toast.error("Ảnh tối đa 5MB");
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from(NEWS_BUCKET).upload(path, file, { contentType: file.type });
    if (error) return void toast.error("Tải ảnh thất bại: " + error.message);
    setF((x) => x && { ...x, cover_path: path }); toast.success("Đã tải ảnh bìa");
  };

  const requestRevision = (a: NewsRow) => {
    const note = window.prompt("Góp ý cho tác giả (bắt buộc):", a.review_note);
    if (!note?.trim()) return;
    patch(a.id, { status: "needs_revision", review_note: note.trim() }, "Đã yêu cầu chỉnh sửa");
  };

  const rows = (list.data ?? []).filter((a) => !filter || a.status === filter);
  const pending = (list.data ?? []).filter((a) => a.status === "pending_review").length;
  const editable = (a: NewsRow) => reviewer || ["draft", "pending_review", "needs_revision"].includes(a.status);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-deep">Tin tức</h1>
          <p className="text-sm text-muted-foreground">
            {reviewer ? "Bạn có quyền duyệt & xuất bản bài viết của Ban Truyền thông – Marketing." : "Soạn bài, lưu nháp và gửi duyệt. Trưởng/Phó Ban sẽ duyệt trước khi bài được đăng."}
          </p>
        </div>
        <button onClick={() => setF({ ...EMPTY })} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Viết bài mới</button>
      </div>

      {reviewer && pending > 0 && <div className="rounded-xl border border-gold/50 bg-gold/10 p-3 text-sm">Có <b>{pending}</b> bài đang chờ duyệt.</div>}

      {f && (
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
          {f.review_note && f.status === "needs_revision" && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2">Góp ý của người duyệt: {f.review_note}</p>}
          <label className="text-xs text-muted-foreground sm:col-span-2">Tiêu đề<input className={`${inp} mt-1`} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value, slug: f.id ? f.slug : slugify(e.target.value) })} /></label>
          <label className="text-xs text-muted-foreground">Đường dẫn<input className={`${inp} mt-1`} value={f.slug} onChange={(e) => setF({ ...f, slug: slugify(e.target.value) })} /></label>
          <label className="text-xs text-muted-foreground">Chuyên mục
            <select className={`${inp} mt-1`} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{NEWS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="text-xs text-muted-foreground sm:col-span-2">Tóm tắt<textarea rows={2} className={`${inp} mt-1`} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground sm:col-span-2">Nội dung (cách 1 dòng trống giữa các đoạn)<textarea rows={10} className={`${inp} mt-1`} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} /></label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary"><Upload className="h-4 w-4" /> {f.cover_path ? "Đổi ảnh bìa" : "Tải ảnh bìa (≤5MB)"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
            <button onClick={() => setF(null)} className="rounded-full border border-border px-4 py-2 text-sm">Hủy</button>
            <button disabled={busy} onClick={() => save("draft")} className="rounded-full border border-border px-4 py-2 text-sm">Lưu nháp</button>
            <button disabled={busy} onClick={() => save("pending_review")} className="inline-flex items-center gap-1 rounded-full bg-secondary px-4 py-2 text-sm font-semibold"><Send className="h-4 w-4" /> Gửi duyệt</button>
            {reviewer && <button disabled={busy} onClick={() => save("published")} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Check className="h-4 w-4" /> Duyệt & Xuất bản</button>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["", ...Object.keys(NEWS_STATUS_LABEL)] as (NewsStatus | "")[]).map((k) => (
          <button key={k || "all"} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-xs ${filter === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{k ? NEWS_STATUS_LABEL[k] : "Tất cả"}</button>
        ))}
      </div>

      <div className="space-y-3">
        {list.isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
        {!list.isLoading && rows.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Chưa có bài viết.</p>}
        {rows.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
            {a.cover ? <img src={a.cover} alt="" className="h-16 w-24 rounded-lg object-cover" /> : <div className="h-16 w-24 rounded-lg bg-accent" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${TONE[a.status]}`}>{NEWS_STATUS_LABEL[a.status]}</span>
                <span className="text-primary">{a.category}</span>{a.is_featured && <Star className="h-3.5 w-3.5 fill-gold text-gold" />}
              </div>
              <p className="mt-1 truncate font-semibold">{a.title}</p>
              <p className="text-xs text-muted-foreground">Tác giả: {a.author_name || "—"} · Cập nhật {fmtDate(a.updated_at)}{a.reviewer_name && ` · Duyệt bởi ${a.reviewer_name}`}</p>
              {a.status === "needs_revision" && a.review_note && <p className="mt-1 text-xs text-destructive">Góp ý: {a.review_note}</p>}
            </div>
            <div className="flex gap-1.5">
              {editable(a) && <button title="Sửa" onClick={() => setF({ id: a.id, title: a.title, slug: a.slug, summary: a.summary, content: a.content, category: a.category, cover_path: a.cover_path, review_note: a.review_note, status: a.status })} className="rounded-lg border border-border p-2"><Pencil className="h-4 w-4" /></button>}
              {reviewer && a.status !== "published" && <button title="Duyệt & Xuất bản" onClick={() => patch(a.id, { status: "published", review_note: "" }, "Đã xuất bản")} className="rounded-lg border border-border p-2 text-primary"><Check className="h-4 w-4" /></button>}
              {reviewer && a.status === "pending_review" && <button title="Yêu cầu chỉnh sửa" onClick={() => requestRevision(a)} className="rounded-lg border border-border p-2"><Undo2 className="h-4 w-4" /></button>}
              {reviewer && a.status === "published" && <button title={a.is_featured ? "Bỏ nổi bật" : "Ghim nổi bật"} onClick={() => patch(a.id, { is_featured: !a.is_featured }, "Đã cập nhật")} className="rounded-lg border border-border p-2"><Star className="h-4 w-4" /></button>}
              {reviewer && a.status === "published" && <button title="Gỡ xuống (lưu trữ)" onClick={() => patch(a.id, { status: "archived" }, "Đã gỡ bài")} className="rounded-lg border border-border p-2 text-xs">Gỡ</button>}
              {(reviewer || a.status === "draft") && <button title="Xóa" onClick={() => window.confirm("Xóa bài viết này?") && patch(a.id, { deleted_at: new Date().toISOString() }, "Đã xóa")} className="rounded-lg border border-border p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
