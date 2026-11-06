import { useEffect, useRef, useState, type RefObject } from "react";

/** Các dialog admin đang mở, theo thứ tự mở. Chỉ phần tử cuối nhận Esc. */
const openDialogs: symbol[] = [];

/**
 * Hành vi chung của AdminDrawer / AdminModal:
 * - Esc đóng dialog mở sau cùng (bỏ qua nếu lớp Radix bên trong đã xử lý, tức e.defaultPrevented).
 * - Mở: focus vào panel (trừ khi ô con đã autoFocus). Đóng: trả focus về phần tử đã mở dialog.
 * `dismissible=false` (ví dụ đang lưu) thì Esc không đóng.
 */
export function useAdminDialog(
  onClose: () => void,
  dismissible = true,
): RefObject<HTMLDivElement | null> {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    const id = Symbol("admin-dialog");
    openDialogs.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (openDialogs[openDialogs.length - 1] !== id) return;
      e.preventDefault();
      if (dismissibleRef.current) onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const i = openDialogs.indexOf(id);
      if (i !== -1) openDialogs.splice(i, 1);
    };
  }, []);

  // Ghi lại phần tử đang focus ngay lúc render, trước khi ô con có autoFocus giành focus.
  const [previouslyFocused] = useState<HTMLElement | null>(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  );

  useEffect(() => {
    const panel = panelRef.current;
    // Ô con đã tự focus (autoFocus) thì giữ nguyên, ngược lại focus vào panel.
    if (panel && !panel.contains(document.activeElement)) panel.focus();
    return () => {
      if (previouslyFocused && document.body.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [previouslyFocused]);

  return panelRef;
}
