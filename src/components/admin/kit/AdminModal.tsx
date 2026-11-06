import { useEffect, useId, type FormEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminDialog } from "@/components/admin/kit/useAdminDialog";

const SIZE = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-4xl lg:max-w-5xl xl:max-w-6xl",
} as const;

export type AdminModalProps = {
  title: ReactNode;
  /** Dòng mô tả dưới tiêu đề; được nối vào aria-describedby. */
  description?: ReactNode;
  /** Icon trong ô vuông màu chính bên trái tiêu đề. */
  icon?: LucideIcon;
  /** sm = max-w-md, md = max-w-2xl (mặc định), lg = max-w-4xl, xl = max-w-4xl lg:max-w-5xl xl:max-w-6xl. */
  size?: "sm" | "md" | "lg" | "xl";
  onClose: () => void;
  /** false khi đang xử lý: lớp phủ, nút X và Esc đều không đóng được. Mặc định true. */
  dismissible?: boolean;
  /** Nội dung thanh dưới. Tự sắp xếp bên trong (nút, tiến trình…), khung chỉ lo viền và padding. */
  footer?: ReactNode;
  /** Có thì thân + footer được bọc trong <form onSubmit>. */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  /** Class bố cục của phần thân, mặc định "space-y-4". */
  bodyClassName?: string;
  children: ReactNode;
};

/**
 * Khung modal chuẩn của admin đặt giữa màn hình: bo góc 2xl, header có icon/mô tả/nút đóng,
 * phần thân cuộn được, footer tùy chọn, tự quản lý focus và Esc theo ngăn xếp lớp.
 *
 * Lưu ý:
 * - Trang gọi bọc `<AnimatePresence>` giống `AdminDrawer` để giữ hiệu ứng mờ/thu phóng khi đóng.
 * - Modal hiển thị ở `z-[70]`, nằm đè an toàn lên `AdminDrawer` (`z-[60]`). Esc đóng modal trước rồi mới đến drawer.
 * - Khóa cuộn body khi mở, trả lại giá trị cũ khi đóng.
 *
 * @example
 * <AnimatePresence>
 *   {open && (
 *     <AdminModal
 *       title="Tạo nhiệm vụ"
 *       description="Giao việc cho thành viên trong ban"
 *       icon={PlusCircle}
 *       onClose={() => setOpen(false)}
 *       footer={
 *         <div className="flex justify-end gap-2">
 *           <Button size="admin" variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
 *           <Button size="admin-lg" onClick={handleSave}>Lưu</Button>
 *         </div>
 *       }
 *     >
 *       <FormField label="Tên">{(f) => <AdminInput {...f} />}</FormField>
 *     </AdminModal>
 *   )}
 * </AnimatePresence>
 */
export function AdminModal({
  title,
  description,
  icon: Icon,
  size = "md",
  onClose,
  dismissible = true,
  footer,
  onSubmit,
  bodyClassName = "space-y-4",
  children,
}: AdminModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useAdminDialog(onClose, dismissible);

  // Khóa cuộn trang phía sau khi modal mở (drawer không khóa).
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const content = (
    <>
      <div
        className={`custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 ${bodyClassName}`}
      >
        {children}
      </div>
      {footer && (
        <footer className="shrink-0 border-t border-border/70 bg-card/95 px-4 py-3 backdrop-blur-xs sm:px-5">
          {footer}
        </footer>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      <motion.div
        data-slot="modal-overlay"
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={dismissible ? onClose : undefined}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...(description ? { "aria-describedby": descId } : {})}
        tabIndex={-1}
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className={`relative z-10 flex max-h-[92vh] w-full ${SIZE[size]} flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl outline-none`}
      >
        <header className="flex shrink-0 items-start gap-2 border-b border-border/70 px-4 py-3.5 sm:px-5">
          {Icon && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon aria-hidden className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-bold text-foreground">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-[11px] text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="admin-icon"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Đóng"
            title="Đóng (Esc)"
            className="shrink-0 text-muted-foreground"
          >
            <X />
          </Button>
        </header>
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            {content}
          </form>
        ) : (
          content
        )}
      </motion.div>
    </div>
  );
}
