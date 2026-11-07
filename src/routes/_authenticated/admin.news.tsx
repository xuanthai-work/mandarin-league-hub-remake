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
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NEWS_CATEGORIES } from "@/lib/data/news";
import {
  NEWS_STATUS_LABEL,
  NEWS_STATUS_TONE,
  fmtDate,
  withCovers,
  type NewsRow,
  type NewsStatus,
} from "@/lib/news-db";
import { can, NO_PERMISSIONS } from "@/lib/permission-catalog";
import { matchesSearch } from "@/lib/search";
import { useAdminAccess } from "./admin";
import { TrashList } from "@/components/admin/Trash";
import { useConfirm } from "@/components/admin/kit/useConfirm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { StatFilterCard } from "@/components/admin/kit/StatFilterCard";
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

function NewsAdmin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const access = useAdminAccess().data;
  const perms = access?.perms ?? NO_PERMISSIONS;
  const canWrite = can(perms, "news.edit");
  const me = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => (await supabase.auth.getSession()).data.session?.user.id ?? null,
  });
  const reviewable = useQuery({
    queryKey: ["admin-news-reviewable"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("news_reviewable_ids");
      if (error) throw new Error(error.message);
      return new Set(data ?? []);
    },
  });
  /** Rank rule: only someone above the author (or an admin) reviews, publishes or archives. */
  const canReview = (a: NewsRow) => !!reviewable.data?.has(a.id);
  const isMine = (a: NewsRow) => !!me.data && a.author_id === me.data;
  const canPurge = can(perms, "trash.purge");
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
    qc.invalidateQueries({ queryKey: ["admin-news-reviewable"] });
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
    canReview(a) || (isMine(a) && ["draft", "pending_review", "needs_revision"].includes(a.status));

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
      sub: "Cần người chức cao hơn tác giả duyệt",
      highlightGold: allRows.some((a) => a.status === "pending_review" && canReview(a)),
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
        description="Viết bài và gửi duyệt. Bài được duyệt và đăng bởi người có chức vụ cao hơn tác giả."
        actions={
          canWrite ? (
            <Button
              size="admin"
              onClick={() => navigate({ to: "/admin/news/$id", params: { id: "new" } })}
            >
              <Plus /> Viết bài mới
            </Button>
          ) : null
        }
      />

      {/* Thẻ số liệu */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((c) => (
          <StatFilterCard
            key={c.key}
            label={c.label}
            value={c.count}
            hint={c.sub}
            icon={c.icon}
            active={!trash && status === c.key}
            attention={Boolean(c.highlightGold)}
            onToggle={() => {
              setTrash(false);
              setStatus((prev) => (prev === c.key ? "" : c.key));
            }}
          />
        ))}
      </div>

      {/* Thanh lọc */}
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tìm tiêu đề, tóm tắt, tác giả…"
          label="Tìm kiếm bài viết"
        />

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

        {(canWrite || canPurge) && (
          <Button
            type="button"
            size="admin"
            variant={trash ? "destructive" : "outline"}
            aria-pressed={trash}
            className="ml-auto"
            onClick={() => setTrash((prev) => !prev)}
          >
            <Trash2 />
            <span>Thùng rác</span>
          </Button>
        )}
      </div>

      {trash ? (
        <TrashList
          table="news_articles"
          canHardDelete={canPurge}
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
            <EmptyState
              title="Chưa có bài viết nào"
              description="Bắt đầu bằng cách tạo bài viết mới đầu tiên cho câu lạc bộ."
              action={
                <Button
                  size="admin"
                  onClick={() => navigate({ to: "/admin/news/$id", params: { id: "new" } })}
                >
                  <Plus /> Viết bài đầu tiên
                </Button>
              }
            />
          )}

          {!list.isLoading && allRows.length > 0 && filteredRows.length === 0 && (
            <EmptyState
              title="Không tìm thấy bài viết phù hợp"
              description="Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc đang chọn."
              action={
                <Button
                  variant="outline"
                  size="admin"
                  onClick={() => {
                    setStatus("");
                    setCategory("");
                    setQ("");
                  }}
                >
                  Xóa bộ lọc
                </Button>
              }
            />
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
                    <StatusPill tone={NEWS_STATUS_TONE[a.status] ?? "neutral"}>
                      {NEWS_STATUS_LABEL[a.status] ?? a.status}
                    </StatusPill>
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
                  {canReview(a) && a.status === "pending_review" ? (
                    <Button
                      size="admin-sm"
                      onClick={() => navigate({ to: "/admin/news/$id", params: { id: a.id } })}
                    >
                      Duyệt
                    </Button>
                  ) : a.status === "published" ? (
                    <Button asChild variant="outline" size="admin-sm">
                      <a href={`/news/${a.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink />
                        <span>Xem trên web</span>
                      </a>
                    </Button>
                  ) : editable(a) ? (
                    <Button
                      variant="outline"
                      size="admin-sm"
                      onClick={() => navigate({ to: "/admin/news/$id", params: { id: a.id } })}
                    >
                      <Pencil />
                      <span>Sửa</span>
                    </Button>
                  ) : null}

                  {/* Menu ⋯ */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="admin-icon" aria-label="Thao tác khác">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <DropdownMenuItem
                        onClick={() => navigate({ to: "/admin/news/$id", params: { id: a.id } })}
                      >
                        Mở trang soạn
                      </DropdownMenuItem>

                      {canReview(a) && a.status === "published" && (
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

                      {(canReview(a) || (isMine(a) && a.status === "draft")) && (
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
