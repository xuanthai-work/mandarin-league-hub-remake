import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const WIDTH = {
  sm: "max-w-[480px]",
  md: "max-w-[560px]",
  lg: "max-w-[640px]",
} as const;

type AdminDrawerProps = {
  /** Tiêu đề trong header, đồng thời là tên của dialog cho trình đọc màn hình (aria-labelledby). */
  title: ReactNode;
  /** Dòng phụ dưới tiêu đề (tên bản ghi, StatusPill…). */
  subtitle?: ReactNode;
  /** Phần tử bên trái tiêu đề: logo, avatar, icon. */
  leading?: ReactNode;
  /** sm = 480px, md = 560px (mặc định), lg = 640px. */
  width?: "sm" | "md" | "lg";
  onClose: () => void;
  /** Thanh dưới cùng, thường là nút lưu <Button size="admin-lg">. */
  footer?: ReactNode;
  /** Có thì phần thân + footer được bọc trong <form onSubmit>, để nút type="submit" ở footer hoạt động. */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  /** Class khoảng cách của phần thân, mặc định "space-y-6". */
  bodyClassName?: string;
  children: ReactNode;
};

/**
 * Khung drawer chuẩn của admin: trượt từ phải sang, nền mờ, hỗ trợ Esc và quản lý focus.
 * Bọc ngoài bằng <AnimatePresence> ở trang gọi để giữ hiệu ứng trượt khi đóng.
 *
 * @example
 * <AnimatePresence>
 *   {edit && (
 *     <AdminDrawer
 *       title={edit.id ? "Sửa đối tác" : "Thêm đối tác mới"}
 *       subtitle={edit.name}
 *       onClose={() => setEdit(null)}
 *       footer={<Button size="admin-lg" onClick={save}>Lưu thay đổi</Button>}
 *     >
 *       {...nội dung...}
 *       <DangerZone ... />
 *     </AdminDrawer>
 *   )}
 * </AnimatePresence>
 */
export function AdminDrawer({
  title,
  subtitle,
  leading,
  width = "md",
  onClose,
  footer,
  onSubmit,
  bodyClassName = "space-y-6",
  children,
}: AdminDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, []);

  const content = (
    <>
      <div
        className={`custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 ${bodyClassName}`}
      >
        {children}
      </div>
      {footer && (
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/70 bg-card/90 px-4 py-4 backdrop-blur-xs sm:px-6">
          {footer}
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        data-slot="drawer-overlay"
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className={`relative z-10 flex h-full w-full ${WIDTH[width]} flex-col border-l border-border bg-card shadow-2xl outline-none`}
      >
        {/* header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {leading}
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-base font-bold text-foreground">
                {title}
              </h2>
              {subtitle && (
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="admin-icon"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng (Esc)"
            className="shrink-0 text-muted-foreground"
          >
            <X />
          </Button>
        </div>

        {/* thân + footer */}
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
