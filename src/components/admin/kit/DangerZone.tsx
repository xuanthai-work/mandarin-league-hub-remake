import { useEffect, useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DangerZoneProps = {
  /** Tiêu đề in hoa phía trên hộp, mặc định "Vùng nguy hiểm". */
  heading?: string;
  /** Tên hành động, ví dụ "Xóa đối tác". */
  title: string;
  description: ReactNode;
  confirmDescription?: ReactNode;
  actionLabel: string;
  confirmLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  /** Nội dung phụ dưới mô tả, ví dụ cảnh báo "Đang phụ trách 3 lớp…". */
  children?: ReactNode;
};

/** Vùng nguy hiểm chuẩn trong drawer/modal admin: xác nhận 2 bước trước khi xóa. */
export function DangerZone({
  heading = "Vùng nguy hiểm",
  title,
  description,
  confirmDescription = "Bấm “Xác nhận xóa” để hoàn tất. Không hoàn tác được.",
  actionLabel,
  confirmLabel = "Xác nhận xóa",
  onConfirm,
  disabled = false,
  children,
}: DangerZoneProps) {
  const [armed, setArmed] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const actionBtnRef = useRef<HTMLButtonElement>(null);
  const wasArmed = useRef(false);

  useEffect(() => {
    if (armed) {
      confirmBtnRef.current?.focus();
      wasArmed.current = true;
    } else if (wasArmed.current) {
      actionBtnRef.current?.focus();
      wasArmed.current = false;
    }
  }, [armed]);

  return (
    <section className="space-y-2 pt-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">{heading}</h3>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">
            {armed ? confirmDescription : description}
          </p>
          {children}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {armed ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="admin"
                disabled={disabled}
                onClick={() => setArmed(false)}
              >
                Thôi
              </Button>
              <Button
                ref={confirmBtnRef}
                type="button"
                variant="destructive"
                size="admin"
                disabled={disabled}
                onClick={() => {
                  setArmed(false);
                  onConfirm();
                }}
              >
                {confirmLabel}
              </Button>
            </>
          ) : (
            <Button
              ref={actionBtnRef}
              type="button"
              variant="destructive-outline"
              size="admin"
              disabled={disabled}
              onClick={() => setArmed(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{actionLabel}</span>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
