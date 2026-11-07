import { useEffect, useState } from "react";
import { Link2, MessageCircle, Send } from "lucide-react";

import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
import { FormField } from "@/components/admin/kit/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildEvidence } from "./shared";

interface TaskSubmitDialogProps {
  /** Title of the task being reported; `null` closes the dialog. */
  title: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (evidence: string, note: string) => void;
}

export function TaskSubmitDialog({ title, busy, onClose, onConfirm }: TaskSubmitDialogProps) {
  const [mode, setMode] = useState<"zalo" | "link">("zalo");
  const [link, setLink] = useState("");
  const [to, setTo] = useState("");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (title) {
      setMode("zalo");
      setLink("");
      setTo("");
      setWhen("");
      setNote("");
      setErr("");
    }
  }, [title]);

  const handleSubmit = () => {
    const res = buildEvidence({ mode, link, to, when, note });
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setErr("");
    onConfirm(res.evidence, res.note);
  };

  return (
    <Dialog open={!!title} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Send aria-hidden className="h-4 w-4 text-primary" />
            Nộp báo cáo nhiệm vụ
          </DialogTitle>
          <DialogDescription className="text-xs">
            {title
              ? `“${title}” sẽ chuyển sang Chờ duyệt báo cáo và người giao việc nhận được minh chứng của bạn.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="admin-sm"
              variant={mode === "zalo" ? "default" : "outline"}
              aria-pressed={mode === "zalo"}
              onClick={() => {
                setMode("zalo");
                setErr("");
              }}
              className="flex-1 gap-1.5"
            >
              <MessageCircle aria-hidden className="h-4 w-4" />
              Đã gửi qua Zalo
            </Button>
            <Button
              type="button"
              size="admin-sm"
              variant={mode === "link" ? "default" : "outline"}
              aria-pressed={mode === "link"}
              onClick={() => {
                setMode("link");
                setErr("");
              }}
              className="flex-1 gap-1.5"
            >
              <Link2 aria-hidden className="h-4 w-4" />
              Dán link
            </Button>
          </div>

          {mode === "link" ? (
            <FormField label="Link minh chứng" required>
              {(field) => (
                <AdminInput
                  {...field}
                  autoFocus
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://drive.google.com/…"
                  maxLength={500}
                />
              )}
            </FormField>
          ) : (
            <>
              <FormField label="Gửi tới" required>
                {(field) => (
                  <AdminInput
                    {...field}
                    autoFocus
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="VD: Nhóm Zalo Ban Thiết kế"
                    maxLength={150}
                  />
                )}
              </FormField>
              <FormField label="Thời điểm gửi">
                {(field) => (
                  <AdminInput
                    {...field}
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    placeholder="VD: 20h ngày 7/11"
                    maxLength={80}
                  />
                )}
              </FormField>
            </>
          )}

          <div className="space-y-1.5">
            <FormField label="Ghi chú" required={mode === "zalo"}>
              {(field) => (
                <AdminTextarea
                  {...field}
                  rows={3}
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    mode === "zalo"
                      ? "Ghi chú nội dung đã gửi để người duyệt dễ đối chiếu…"
                      : "Ghi chú thêm (tùy chọn)…"
                  }
                  className="resize-y text-xs leading-relaxed"
                />
              )}
            </FormField>
            <span className="block text-right text-[10px] text-muted-foreground">
              {note.length.toLocaleString("vi-VN")} / 2.000 ký tự
            </span>
          </div>

          {err && (
            <p role="alert" className="text-xs text-destructive">
              {err}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" size="admin" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="button" size="admin" onClick={handleSubmit} disabled={busy}>
            {busy ? "Đang nộp…" : "Nộp báo cáo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
