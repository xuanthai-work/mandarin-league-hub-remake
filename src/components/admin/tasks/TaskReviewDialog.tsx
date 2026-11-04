import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TaskReviewDialogProps {
  /** Title of the task (or group) being sent back; `null` closes the dialog. */
  title: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

/** Replaces `window.prompt`: a real form so the revision reason is reviewable before sending. */
export function TaskReviewDialog({ title, busy, onClose, onConfirm }: TaskReviewDialogProps) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (title) setNote("");
  }, [title]);

  const trimmed = note.trim();

  return (
    <Dialog open={!!title} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <RotateCcw aria-hidden className="h-4 w-4 text-destructive" />
            Yêu cầu làm lại nhiệm vụ
          </DialogTitle>
          <DialogDescription className="text-xs">
            {title
              ? `“${title}” sẽ quay về trạng thái Cần làm lại và thành viên nhận được góp ý của bạn.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Lý do / góp ý (bắt buộc)
          </span>
          <textarea
            autoFocus
            rows={4}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Minh chứng chưa đúng yêu cầu, cần bổ sung link và số liệu cụ thể."
            className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="block text-right text-[10px] text-muted-foreground">
            {note.length.toLocaleString("vi-VN")} / 1.000 ký tự
          </span>
        </label>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmed)}
            disabled={!trimmed || busy}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Đang gửi…" : "Gửi yêu cầu làm lại"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
