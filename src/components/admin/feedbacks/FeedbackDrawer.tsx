import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareReply } from "lucide-react";
import { toast } from "sonner";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { AdminTextarea } from "@/components/admin/kit/AdminInput";
import { FormField } from "@/components/admin/kit/FormField";
import { MemberAvatar } from "@/components/admin/kit/MemberAvatar";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  feedbackScreenshotUrl,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABEL,
  FEEDBACK_TYPE_LABEL,
  updateFeedbackStatus,
  type FeedbackItem,
  type FeedbackStatus,
} from "@/lib/feedbacks";
import { deptName } from "@/lib/recruitment";
import { FEEDBACK_STATUS_TONE, FEEDBACK_TYPE_TONE, formatFeedbackDate } from "./shared";

interface FeedbackDrawerProps {
  item: FeedbackItem;
  /** Signed avatar of the writer, if any. */
  avatarUrl?: string | null | undefined;
  canReview: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

/** Chi tiết một đơn nhận xét: người viết, nội dung, ảnh và phản hồi của Ban Hệ thống. */
export function FeedbackDrawer({
  item,
  avatarUrl,
  canReview,
  onClose,
  onUpdated,
}: FeedbackDrawerProps) {
  const [status, setStatus] = useState<FeedbackStatus>(item.status);
  const [note, setNote] = useState(item.admin_note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const screenshot = useQuery({
    queryKey: ["feedback-screenshot", item.screenshot_url],
    enabled: !!item.screenshot_url,
    staleTime: 5 * 60 * 1000,
    queryFn: () => feedbackScreenshotUrl(item.screenshot_url),
  });

  const writer = item.member;
  const writerName = writer?.full_name ?? "Thành viên";
  const writerMeta = [writer?.position, writer ? deptName(writer.department) : null]
    .filter(Boolean)
    .join(" · ");

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await updateFeedbackStatus(item.id, { status, admin_note: note });
      toast.success("Đã lưu phản hồi");
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được phản hồi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDrawer
      title={item.title}
      subtitle={
        <span className="flex items-center gap-2">
          <StatusPill tone={FEEDBACK_TYPE_TONE[item.type]}>
            {FEEDBACK_TYPE_LABEL[item.type]}
          </StatusPill>
          <StatusPill tone={FEEDBACK_STATUS_TONE[canReview ? status : item.status]}>
            {FEEDBACK_STATUS_LABEL[canReview ? status : item.status]}
          </StatusPill>
        </span>
      }
      leading={
        <MemberAvatar
          src={avatarUrl}
          name={writerName}
          className="h-10 w-10 text-[11px]"
          fallbackClassName="h-10 w-10 text-[11px] bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/25"
        />
      }
      onClose={onClose}
      dismissible={!saving}
      {...(canReview
        ? {
            onSubmit: (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              void save();
            },
            footer: (
              <div className="flex w-full items-center justify-end gap-2">
                <Button
                  type="button"
                  size="admin"
                  variant="ghost"
                  onClick={onClose}
                  disabled={saving}
                >
                  Đóng
                </Button>
                <Button type="submit" size="admin-lg" disabled={saving}>
                  {saving ? "Đang lưu…" : "Lưu phản hồi"}
                </Button>
              </div>
            ),
          }
        : {})}
    >
      <section className="rounded-2xl border border-border/80 bg-secondary/20 p-4">
        <div className="flex items-start gap-3">
          <MemberAvatar
            src={avatarUrl}
            name={writerName}
            className="h-11 w-11 text-xs"
            fallbackClassName="h-11 w-11 text-xs bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/25"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{writerName}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {writer?.member_code || "Chưa có mã"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{writerMeta || "Chưa rõ Ban"}</p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-[11px]">
          <div>
            <dt className="text-muted-foreground">Ngày giờ gửi</dt>
            <dd className="font-medium text-foreground">{formatFeedbackDate(item.created_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cập nhật gần nhất</dt>
            <dd className="font-medium text-foreground">{formatFeedbackDate(item.updated_at)}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Nội dung chi tiết
        </h3>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
          {item.content}
        </p>
      </section>

      {item.screenshot_url && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Ảnh chụp màn hình
          </h3>
          <div className="mt-2 overflow-hidden rounded-xl border border-border bg-muted/20">
            {screenshot.isLoading ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">Đang tải ảnh…</p>
            ) : screenshot.data ? (
              <a href={screenshot.data} target="_blank" rel="noreferrer" title="Mở ảnh đầy đủ">
                <img
                  src={screenshot.data}
                  alt={`Ảnh chụp màn hình của ${writerName}`}
                  className="max-h-[360px] w-full object-contain"
                />
              </a>
            ) : (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Không tải được ảnh đính kèm.
              </p>
            )}
          </div>
        </section>
      )}

      {(item.admin_note || item.resolved_at) && !canReview && (
        <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <MessageSquareReply aria-hidden className="h-3.5 w-3.5" />
            Phản hồi từ Ban Hệ thống
          </h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
            {item.admin_note || "Ban Hệ thống đã ghi nhận đơn này."}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {item.resolved_at
              ? `${item.resolver?.full_name || "Ban Hệ thống"} · ${formatFeedbackDate(item.resolved_at)}`
              : `${item.resolver?.full_name || "Ban Hệ thống"} · ${formatFeedbackDate(item.updated_at)}`}
          </p>
        </section>
      )}

      {canReview && (
        <section className="space-y-3 rounded-2xl border border-border/80 p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <MessageSquareReply aria-hidden className="h-3.5 w-3.5" />
            Xử lý đơn
          </h3>
          <FormField label="Trạng thái">
            {(field) => (
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as FeedbackStatus)}
                disabled={saving}
              >
                <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
                  <SelectValue>{FEEDBACK_STATUS_LABEL[status]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {FEEDBACK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {FEEDBACK_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField
            label="Phản hồi / Ghi chú xử lý"
            hint="Người viết đọc được phản hồi này trong đơn của họ."
          >
            {(field) => (
              <AdminTextarea
                {...field}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Đã kiểm tra, sẽ sửa trong bản cập nhật tới…"
                disabled={saving}
              />
            )}
          </FormField>
          {item.resolved_at && (
            <p className="text-[11px] text-muted-foreground">
              Đã xử lý bởi {item.resolver?.full_name || "thành viên"} lúc{" "}
              {formatFeedbackDate(item.resolved_at)}.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </p>
          )}
        </section>
      )}
    </AdminDrawer>
  );
}
