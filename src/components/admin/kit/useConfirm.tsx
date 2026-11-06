import { useRef, useState } from "react";
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

export type ConfirmOpts = {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
};

/**
 * Hộp thoại xác nhận chuẩn của admin dựa trên Promise, thay thế window.confirm.
 * Trang mới import từ `@/components/admin/kit/useConfirm`.
 */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});
  const confirm = (o: ConfirmOpts) =>
    new Promise<boolean>((res) => {
      resolver.current = res;
      setOpts(o);
    });
  const close = (v: boolean) => {
    resolver.current(v);
    setOpts(null);
  };
  const dialog = (
    <AlertDialog open={!!opts} onOpenChange={(o) => !o && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {opts?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={
              opts?.destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {opts?.confirmLabel ?? "Xác nhận"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { confirm, dialog };
}
