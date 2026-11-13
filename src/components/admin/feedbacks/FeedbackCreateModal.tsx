import { useState } from "react";
import { ImagePlus, MessageSquarePlus, X } from "lucide-react";
import { toast } from "sonner";

import { AdminModal } from "@/components/admin/kit/AdminModal";
import { FormField } from "@/components/admin/kit/FormField";
import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFeedback,
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABEL,
  uploadFeedbackScreenshot,
  type FeedbackType,
} from "@/lib/feedbacks";

interface FeedbackCreateModalProps {
  /** Writer's own label, e.g. "Nguyễn Văn A · TML-MBR-2611-0001". */
  meLabel: string;
  onClose: () => void;
  onCreated: () => void;
}

/** "Gửi nhận xét": one modal for a bug report, an improvement idea or another comment. */
export function FeedbackCreateModal({ meLabel, onClose, onCreated }: FeedbackCreateModalProps) {
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const pickFile = (next: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    if (!next) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!next.type.startsWith("image/")) return void toast.error("Chỉ đính kèm được tệp ảnh");
    if (next.size > 5 * 1024 * 1024) return void toast.error("Ảnh chụp màn hình tối đa 5MB");
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const close = () => {
    if (saving) return;
    if (preview) URL.revokeObjectURL(preview);
    onClose();
  };

  const submit = async () => {
    setError("");
    if (title.trim().length < 3) return setError("Tiêu đề phải có ít nhất 3 ký tự");
    if (title.trim().length > 200) return setError("Tiêu đề tối đa 200 ký tự");
    if (content.trim().length < 10) return setError("Nội dung phải có ít nhất 10 ký tự");
    if (content.trim().length > 5000) return setError("Nội dung tối đa 5000 ký tự");

    setSaving(true);
    try {
      const screenshotPath = file ? await uploadFeedbackScreenshot(file) : "";
      await createFeedback({ type, title, content, screenshot_path: screenshotPath });
      toast.success("Đã gửi nhận xét");
      if (preview) URL.revokeObjectURL(preview);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được nhận xét");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      title="Gửi nhận xét"
      description={`Gửi dưới tên ${meLabel || "tài khoản của bạn"}`}
      icon={MessageSquarePlus}
      dismissible={!saving}
      onClose={close}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" size="admin" variant="ghost" onClick={close} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" size="admin-lg" disabled={saving}>
            {saving ? "Đang gửi…" : "Gửi nhận xét"}
          </Button>
        </div>
      }
    >
      <FormField label="Loại nhận xét" required>
        {(field) => (
          <Select value={type} onValueChange={(v) => setType(v as FeedbackType)} disabled={saving}>
            <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
              <SelectValue>{FEEDBACK_TYPE_LABEL[type]}</SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {FEEDBACK_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {FEEDBACK_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField label="Tiêu đề" required>
        {(field) => (
          <AdminInput
            {...field}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Ví dụ: Nút Lưu ở trang Thành viên không hoạt động"
            disabled={saving}
          />
        )}
      </FormField>

      <FormField
        label="Nội dung chi tiết"
        required
        hint="Mô tả rõ lỗi gặp phải hoặc ý kiến đóng góp để Ban Hệ thống xử lý nhanh hơn."
      >
        {(field) => (
          <AdminTextarea
            {...field}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            rows={6}
            className="min-h-[140px]"
            placeholder="Bạn đang làm gì, thấy gì và mong muốn điều gì?"
            disabled={saving}
          />
        )}
      </FormField>

      <div>
        <p className="block text-xs font-medium text-muted-foreground">
          Ảnh chụp màn hình đính kèm (nếu có)
        </p>
        <div className="mt-1">
          {file && preview ? (
            <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30">
              <img
                src={preview}
                alt="Ảnh chụp màn hình đính kèm"
                className="max-h-56 w-full object-contain"
              />
              <Button
                type="button"
                variant="outline"
                size="admin-icon"
                onClick={() => pickFile(null)}
                disabled={saving}
                aria-label="Bỏ ảnh đính kèm"
                title="Bỏ ảnh đính kèm"
                className="absolute right-2 top-2 bg-card"
              >
                <X aria-hidden />
              </Button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
              <ImagePlus aria-hidden className="h-4 w-4" />
              Chọn ảnh (PNG, JPG, WEBP – tối đa 5MB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                disabled={saving}
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </AdminModal>
  );
}
