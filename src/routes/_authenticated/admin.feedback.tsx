import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { MemberAvatar } from "@/components/admin/kit/MemberAvatar";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { FeedbackCreateModal } from "@/components/admin/feedbacks/FeedbackCreateModal";
import { FeedbackDrawer } from "@/components/admin/feedbacks/FeedbackDrawer";
import {
  FEEDBACK_STATUS_TONE,
  FEEDBACK_TYPE_TONE,
  formatFeedbackDate,
} from "@/components/admin/feedbacks/shared";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAvatarUrls } from "@/lib/avatars";
import {
  describeFeedbackError,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABEL,
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABEL,
  useFeedbacks,
  type FeedbackItem,
  type FeedbackStatus,
  type FeedbackType,
} from "@/lib/feedbacks";
import { can } from "@/lib/permission-catalog";
import { deptName, RECRUIT_DEPTS } from "@/lib/recruitment";
import { matchesSearch } from "@/lib/search";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/feedback")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Nhận xét | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: FeedbackPage,
});

const COLUMNS: AdminColumn[] = [
  { key: "writer", label: "Người viết", className: "w-[22%]" },
  { key: "type", label: "Phân loại", className: "w-[104px]" },
  { key: "content", label: "Tiêu đề & Nội dung", className: "w-[30%]" },
  { key: "created", label: "Ngày giờ viết", className: "w-[124px]" },
  { key: "status", label: "Trạng thái", className: "w-[116px]" },
  { key: "actions", label: "Thao tác", srOnly: true, className: "w-[76px] text-right" },
];

type DeptFilter = "all" | string;
type TypeFilter = "all" | FeedbackType;
type StatusFilter = "all" | FeedbackStatus;

/** Long lists reveal in batches so a busy board stays quick to scan. */
const PAGE_SIZE = 50;

function FeedbackPage() {
  const qc = useQueryClient();
  const access = useAdminAccess().data;
  const canReview = !!access && can(access.perms, "feedback.review");

  const list = useFeedbacks(!!access);
  const failure = list.isError ? describeFeedbackError(list.error) : null;
  const items = useMemo<FeedbackItem[]>(() => list.data ?? [], [list.data]);
  const { data: avatarMap } = useAvatarUrls(
    useMemo(() => items.map((f) => f.member?.avatar_path), [items]),
  );

  const [q, setQ] = useState("");
  const [dept, setDept] = useState<DeptFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const rows = useMemo(
    () =>
      items.filter((f) => {
        const m = f.member;
        const term = `${f.title} ${f.content} ${m?.full_name ?? ""} ${m?.member_code ?? ""}`;
        return (
          matchesSearch(term, q) &&
          (dept === "all" || m?.department === dept) &&
          (type === "all" || f.type === type) &&
          (status === "all" || f.status === status)
        );
      }),
    [items, q, dept, type, status],
  );

  const selected = selectedId ? (items.find((f) => f.id === selectedId) ?? null) : null;
  const shown = rows.slice(0, limit);
  const pending = items.filter((f) => f.status === "pending").length;
  const meLabel = [access?.name, access?.position].filter(Boolean).join(" · ");

  /** Any filter change brings the list back to its first page. */
  const refilter = (apply: () => void) => {
    apply();
    setLimit(PAGE_SIZE);
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-feedbacks"] });

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        actions={
          <Button
            type="button"
            size="admin"
            onClick={() => setCreating(true)}
            aria-label="Tạo nhận xét"
            title="Tạo nhận xét"
          >
            <Plus aria-hidden />
            <span className="hidden sm:inline">Tạo nhận xét</span>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={q}
          onChange={(v) => refilter(() => setQ(v))}
          placeholder="Tìm tiêu đề, nội dung, họ tên, mã thành viên…"
          label="Tìm kiếm đơn nhận xét"
        />
        <Select value={dept} onValueChange={(v) => refilter(() => setDept(v))}>
          <SelectTrigger
            aria-label="Lọc theo Ban"
            className="h-9 w-[190px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>{dept === "all" ? "Tất cả Ban" : deptName(dept)}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Tất cả Ban
            </SelectItem>
            {RECRUIT_DEPTS.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-xs">
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => refilter(() => setType(v as TypeFilter))}>
          <SelectTrigger
            aria-label="Lọc theo loại nhận xét"
            className="h-9 w-[160px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>{type === "all" ? "Tất cả loại" : FEEDBACK_TYPE_LABEL[type]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Tất cả loại
            </SelectItem>
            {FEEDBACK_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {FEEDBACK_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => refilter(() => setStatus(v as StatusFilter))}>
          <SelectTrigger
            aria-label="Lọc theo trạng thái"
            className="h-9 w-[170px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>
              {status === "all" ? "Tất cả trạng thái" : FEEDBACK_STATUS_LABEL[status]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Tất cả trạng thái
            </SelectItem>
            {FEEDBACK_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {FEEDBACK_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {rows.length} đơn · {pending} chờ xử lý
        </span>
      </div>

      {list.isLoading ? (
        <EmptyState title="Đang tải danh sách nhận xét…" />
      ) : list.isError ? (
        <EmptyState
          tone="error"
          title="Không tải được danh sách nhận xét"
          description={
            <span className="block">
              <span className="block">{failure?.message ?? "Vui lòng thử lại sau ít phút."}</span>
              {failure?.detail && (
                <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                  Chi tiết: {failure.detail}
                </span>
              )}
            </span>
          }
          action={
            <Button type="button" size="admin" variant="outline" onClick={refresh}>
              Thử lại
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={canReview ? "Chưa có đơn nhận xét nào" : "Bạn chưa gửi đơn nhận xét nào"}
          description={`Bấm “Tạo nhận xét” để gửi báo lỗi hoặc góp ý cải thiện website.`}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Không tìm thấy đơn phù hợp"
          description="Thử xóa từ khóa hoặc chọn lại bộ lọc Ban, loại nhận xét và trạng thái."
        />
      ) : (
        <div className="space-y-3">
          <AdminTable
            columns={COLUMNS}
            minWidth="min-w-[980px]"
            isEmpty={rows.length === 0}
            emptyMessage="Không có đơn nhận xét."
          >
            {shown.map((f) => {
              const writer = f.member;
              const name = writer?.full_name ?? "Thành viên";
              const meta = [writer?.position, writer ? deptName(writer.department) : null]
                .filter(Boolean)
                .join(" · ");
              return (
                <AdminTableRow key={f.id} onOpen={() => setSelectedId(f.id)}>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar
                        src={writer?.avatar_path ? avatarMap?.get(writer.avatar_path) : null}
                        name={name}
                        className="h-8 w-8 text-[10px]"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{name}</p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {writer?.member_code || "Chưa có mã"}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {meta || "Chưa rõ Ban"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <StatusPill tone={FEEDBACK_TYPE_TONE[f.type]}>
                      {FEEDBACK_TYPE_LABEL[f.type]}
                    </StatusPill>
                  </td>
                  <td className="p-3">
                    <p className="truncate text-xs font-semibold text-foreground" title={f.title}>
                      {f.title}
                    </p>
                    <p
                      className="mt-0.5 truncate text-[11px] text-muted-foreground"
                      title={f.content}
                    >
                      {f.content}
                    </p>
                  </td>
                  <td className="p-3 text-[11px] text-muted-foreground">
                    {formatFeedbackDate(f.created_at)}
                  </td>
                  <td className="p-3">
                    <StatusPill tone={FEEDBACK_STATUS_TONE[f.status]}>
                      {FEEDBACK_STATUS_LABEL[f.status]}
                    </StatusPill>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="admin-sm"
                      onClick={() => setSelectedId(f.id)}
                      aria-label={`Xem đơn ${f.title}`}
                    >
                      Xem
                    </Button>
                  </td>
                </AdminTableRow>
              );
            })}
          </AdminTable>
          {rows.length > shown.length && (
            <div className="flex justify-center">
              <Button
                type="button"
                size="admin"
                variant="outline"
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
              >
                Xem thêm ({rows.length - shown.length} đơn)
              </Button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {creating && (
          <FeedbackCreateModal
            key="create-feedback"
            meLabel={meLabel}
            onClose={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              refresh();
            }}
          />
        )}
        {selected && (
          <FeedbackDrawer
            key={selected.id}
            item={selected}
            avatarUrl={
              selected.member?.avatar_path ? avatarMap?.get(selected.member.avatar_path) : null
            }
            canReview={canReview}
            onClose={() => setSelectedId(null)}
            onUpdated={refresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
