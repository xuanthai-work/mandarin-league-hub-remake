import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Clock,
  ExternalLink,
  FileText,
  Globe,
  ImageOff,
  MoreHorizontal,
  Pencil,
  PencilLine,
  Pin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NEWS_CATEGORIES } from "@/lib/data/news";
import {
  NEWS_STATUS_LABEL,
  fmtDate,
  withCovers,
  type NewsRow,
  type NewsStatus,
} from "@/lib/news-db";
import { canReviewNews } from "@/lib/admin-permissions";
import { matchesSearch } from "@/lib/search";
import { useAdminAccess } from "./admin";
import { TrashList, useConfirm } from "@/components/admin/Trash";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/admin/news")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Tin tức | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: NewsAdmin,
});

const TONE: Record<NewsStatus, string> = {
  draft: "bg-secondary text-secondary-foreground",
  pending_review: "bg-gold/20 text-primary-deep",
  needs_revision: "bg-destructive/15 text-destructive",
  published: "bg-primary/15 text-primary",
  archived: "bg-muted text-muted-foreground",
};

function NewsAdmin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const access = useAdminAccess().data;
  const reviewer = !!access && canReviewNews(access.roles, access.department);
  const isAdmin = !!access?.roles.includes("admin");
  const { confirm, dialog } = useConfirm();

  const [status, setStatus] = useState<NewsStatus | "">("");
  const [category, setCategory] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [trash, setTrash] = useState(false);

  const list = useQuery({
    queryKey: ["admin-news"],
    queryFn: async () => {
      const { data } = await supabase
        .from("news_articles")
        .select("*")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      return withCovers((data ?? []) as NewsRow[]);
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-news"] });
    qc.invalidateQueries({ queryKey: ["public-news"] });
  };

  const patch = async (id: string, p: Record<string, unknown>, msg: string) => {
    const { error } = await supabase
      .from("news_articles")
      .update(p as never)
      .eq("id", id);
    if (error) return void toast.error("Không có quyền hoặc lỗi: " + error.message);
    toast.success(msg);
    refresh();
  };

  const remove = async (a: NewsRow) => {
    if (
      !(await confirm({
        title: "Chuyển vào Thùng rác?",
        description: `Bài "${a.title}" sẽ bị ẩn khỏi website. Bạn có thể khôi phục lại trong mục Thùng rác.`,
        confirmLabel: "Chuyển vào Thùng rác",
        destructive: true,
      }))
    )
      return;
    patch(a.id, { deleted_at: new Date().toISOString() }, "Đã chuyển vào Thùng rác");
  };

  const editable = (a: NewsRow) =>
    reviewer || ["draft", "pending_review", "needs_revision"].includes(a.status);

  const allRows = list.data ?? [];
  const countPublished = allRows.filter((a) => a.status === "published").length;
  const countPending = allRows.filter((a) => a.status === "pending_review").length;
  const countNeedsRevision = allRows.filter((a) => a.status === "needs_revision").length;
  const countDraft = allRows.filter((a) => a.status === "draft").length;

  const statusCounts: Record<NewsStatus, number> = {
    published: countPublished,
    pending_review: countPending,
    needs_revision: countNeedsRevision,
    draft: countDraft,
    archived: allRows.filter((a) => a.status === "archived").length,
  };

  const filteredRows = allRows.filter((a) => {
    if (status && a.status !== status) return false;
    if (category && a.category !== category) return false;
    if (q.trim()) {
      return matchesSearch(`${a.title} ${a.summary} ${a.author_name}`, q);
    }
    return true;
  });

  const statCards: {
    key: NewsStatus;
    label: string;
    icon: typeof Globe;
    count: number;
    sub: string;
    highlightGold?: boolean;
  }[] = [
    {
      key: "published",
      label: "Đã xuất bản",
      icon: Globe,
      count: countPublished,
      sub: "Đang hiển thị trên website",
    },
    {
      key: "pending_review",
      label: "Chờ duyệt",
      icon: Clock,
      count: countPending,
      sub: "Cần Trưởng/Phó Ban duyệt",
      highlightGold: reviewer && countPending > 0,
    },
    {
      key: "needs_revision",
      label: "Cần chỉnh sửa",
      icon: PencilLine,
      count: countNeedsRevision,
      sub: "Chờ tác giả sửa theo góp ý",
    },
    {
      key: "draft",
      label: "Nháp",
      icon: FileText,
      count: countDraft,
      sub: "Chưa gửi duyệt",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      {dialog}
      <AdminPageHeader
        title="Tin tức"
        description={
          reviewer
            ? "Bạn có quyền duyệt & xuất bản bài viết của Ban Truyền thông – Marketing."
            : "Soạn bài, lưu nháp và gửi duyệt. Trưởng/Phó Ban sẽ duyệt trước khi bài được đăng."
        }
        actions={
          <button
            type="button"
            onClick={() => navigate({ to: "/admin/news/$id", params: { id: "new" } })}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Viết bài mới
          </button>
        }
      />

      {/* Thẻ số liệu */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          const isSelected = !trash && status === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setTrash(false);
                setStatus((prev) => (prev === c.key ? "" : c.key));
              }}
              className={`rounded-2xl border p-4 text-left shadow-2xs transition-all hover:border-primary/40 focus:outline-none ${
                isSelected
                  ? "border-primary bg-card ring-2 ring-primary/15"
                  : c.highlightGold
                    ? "border-gold/60 bg-card"
                    : "border-border/70 bg-card"
              }`}
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                  {c.highlightGold && (
                    <span className="inline-block h-2 w-2 rounded-full bg-gold" />
                  )}
                </div>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{c.count}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{c.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Thanh lọc */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            className="h-9 w-full rounded-xl border border-input bg-card pr-8 pl-9 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Tìm tiêu đề, tóm tắt, tác giả…"
            aria-label="Tìm kiếm bài viết"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger
            aria-label="Lọc theo chuyên mục"
            className="h-9 w-[180px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>{category ? category : "Tất cả chuyên mục"}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Tất cả chuyên mục
            </SelectItem>
            {NEWS_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-xs">
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status || "all"}
          onValueChange={(v) => {
            setTrash(false);
            setStatus(v === "all" ? "" : (v as NewsStatus));
          }}
        >
          <SelectTrigger
            aria-label="Lọc theo trạng thái"
            className="h-9 w-[180px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>
              {status
                ? `${NEWS_STATUS_LABEL[status]} (${statusCounts[status] ?? 0})`
                : `Tất cả trạng thái (${allRows.length})`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Tất cả trạng thái ({allRows.length})
            </SelectItem>
            {(Object.keys(NEWS_STATUS_LABEL) as NewsStatus[]).map((k) => (
              <SelectItem key={k} value={k} className="text-xs">
                {NEWS_STATUS_LABEL[k]} ({statusCounts[k] ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(reviewer || isAdmin) && (
          <button
            type="button"
            onClick={() => setTrash((prev) => !prev)}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
              trash
                ? "border-destructive bg-destructive text-destructive-foreground"
                : "border-border/70 bg-card text-foreground hover:bg-muted"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Thùng rác</span>
          </button>
        )}
      </div>

      {trash ? (
        <TrashList
          table="news_articles"
          canHardDelete={isAdmin}
          invalidate={["admin-news", "public-news"]}
        />
      ) : (
        <div className="space-y-3">
          {list.isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex animate-pulse items-start gap-4 rounded-2xl border border-border/70 bg-card p-3 shadow-2xs"
                >
                  <div className="aspect-[16/10] w-20 shrink-0 rounded-lg bg-muted sm:w-28" />
                  <div className="min-w-0 flex-1 space-y-2 py-1">
                    <div className="h-4 w-28 rounded bg-muted" />
                    <div className="h-5 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/3 rounded bg-muted" />
                  </div>
                  <div className="h-8 w-20 shrink-0 rounded-lg bg-muted" />
                </div>
              ))}
            </div>
          )}

          {!list.isLoading && allRows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/80 p-10 text-center">
              <p className="text-sm font-medium text-foreground">Chưa có bài viết nào</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bắt đầu bằng cách tạo bài viết mới đầu tiên cho câu lạc bộ.
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/admin/news/$id", params: { id: "new" } })}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Viết bài đầu tiên
              </button>
            </div>
          )}

          {!list.isLoading && allRows.length > 0 && filteredRows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/80 p-10 text-center">
              <p className="text-sm font-medium text-foreground">Không tìm thấy bài viết phù hợp</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc đang chọn.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus("");
                  setCategory("");
                  setQ("");
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}

          {!list.isLoading &&
            filteredRows.map((a) => (
              <div
                key={a.id}
                role="link"
                tabIndex={0}
                onClick={() => navigate({ to: "/admin/news/$id", params: { id: a.id } })}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter") {
                    e.preventDefault();
                    navigate({ to: "/admin/news/$id", params: { id: a.id } });
                  }
                }}
                className="flex cursor-pointer items-start gap-4 rounded-2xl border border-border/70 bg-card p-3 shadow-2xs transition-all hover:border-primary/30"
              >
                {/* Ảnh bìa */}
                {a.cover ? (
                  <img
                    src={a.cover}
                    alt=""
                    className="aspect-[16/10] w-20 shrink-0 rounded-lg object-cover sm:w-28"
                  />
                ) : (
                  <div className="flex aspect-[16/10] w-20 shrink-0 items-center justify-center rounded-lg bg-muted sm:w-28">
                    <ImageOff className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}

                {/* Nội dung */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        TONE[a.status] ?? TONE.draft
                      }`}
                    >
                      {NEWS_STATUS_LABEL[a.status] ?? a.status}
                    </span>
                    <span className="text-xs font-medium text-primary">{a.category}</span>
                    {a.is_featured && (
                      <span title="Đang ghim nổi bật" className="inline-flex items-center">
                        <Pin className="h-3.5 w-3.5 shrink-0 fill-gold text-gold" />
                      </span>
                    )}
                  </div>

                  <p className="mt-1 line-clamp-2 font-semibold text-foreground">{a.title}</p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.author_name || "—"} ·{" "}
                    {a.status === "published"
                      ? `Xuất bản ${fmtDate(a.published_at)}`
                      : `Cập nhật ${fmtDate(a.updated_at)}`}
                  </p>

                  {a.status === "needs_revision" && a.review_note && (
                    <p className="mt-1 line-clamp-1 text-xs text-destructive">
                      Góp ý: {a.review_note}
                    </p>
                  )}
                </div>

                {/* Thao tác */}
                <div
                  className="flex shrink-0 items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Nút chính */}
                  {reviewer && a.status === "pending_review" ? (
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/admin/news/$id", params: { id: a.id } })}
                      className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      Duyệt
                    </button>
                  ) : a.status === "published" ? (
                    <a
                      href={`/news/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/80 bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Xem trên web</span>
                    </a>
                  ) : editable(a) ? (
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/admin/news/$id", params: { id: a.id } })}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/80 bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Sửa</span>
                    </button>
                  ) : null}

                  {/* Menu ⋯ */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Thao tác khác"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-background text-foreground hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <DropdownMenuItem
                        onClick={() => navigate({ to: "/admin/news/$id", params: { id: a.id } })}
                      >
                        Mở trang soạn
                      </DropdownMenuItem>

                      {reviewer && a.status === "published" && (
                        <>
                          <DropdownMenuItem
                            onClick={() =>
                              patch(a.id, { is_featured: !a.is_featured }, "Đã cập nhật")
                            }
                          >
                            {a.is_featured ? "Bỏ ghim" : "Ghim nổi bật"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => patch(a.id, { status: "archived" }, "Đã gỡ bài")}
                          >
                            Gỡ xuống (lưu trữ)
                          </DropdownMenuItem>
                        </>
                      )}

                      {(reviewer || a.status === "draft") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => remove(a)}
                            className="text-destructive focus:text-destructive"
                          >
                            Chuyển vào thùng rác
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
