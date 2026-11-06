import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { AdminTextarea } from "@/components/admin/kit/AdminInput";
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

        <div className="space-y-1.5">
          <FormField label="Lý do / góp ý" required>
            {(field) => (
              <AdminTextarea
                {...field}
                autoFocus
                rows={4}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Minh chứng chưa đúng yêu cầu, cần bổ sung link và số liệu cụ thể."
                className="resize-y text-xs leading-relaxed"
              />
            )}
          </FormField>
          <span className="block text-right text-[10px] text-muted-foreground">
            {note.length.toLocaleString("vi-VN")} / 1.000 ký tự
          </span>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" size="admin" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="admin"
            onClick={() => onConfirm(trimmed)}
            disabled={!trimmed || busy}
          >
            {busy ? "Đang gửi…" : "Gửi yêu cầu làm lại"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
