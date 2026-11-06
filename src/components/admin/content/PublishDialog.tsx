import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ContentDiffList } from "@/components/admin/content/ContentDiffList";
import type { FieldChange } from "@/lib/site-content-fields";

export interface PublishDialogProps {
  open: boolean;
  changes: FieldChange[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PublishDialog({ open, changes, busy, onCancel, onConfirm }: PublishDialogProps) {
  const title = changes.length > 0 ? `Xuất bản ${changes.length} thay đổi?` : "Xuất bản nội dung?";

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Các thay đổi dưới đây sẽ hiện ngay cho mọi khách truy cập website.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="custom-scrollbar max-h-[55vh] overflow-y-auto pr-1">
          <ContentDiffList changes={changes} emptyText="Bản này giống bản khách đang thấy." />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={busy}>
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {busy ? "Đang xuất bản…" : "Xuất bản"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
