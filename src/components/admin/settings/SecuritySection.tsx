import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
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
import { SettingsRow, SettingsSection, type MyAccount } from "./shared";

function PasswordDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Đổi mật khẩu"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="relative z-10 flex h-full w-full max-w-[480px] flex-col border-l border-border bg-card shadow-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
              <h2 className="text-base font-bold text-foreground">Đổi mật khẩu</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                title="Đóng (Esc)"
                className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <p className="text-sm text-muted-foreground">
                Nhập mật khẩu hiện tại để xác nhận đây là bạn.
              </p>
              <NewPasswordForm
                requireCurrent
                onDone={() => {
                  onClose();
                  toast.success("Đã đổi mật khẩu");
                }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function SecuritySection({ me }: { me: MyAccount }) {
  const [drawer, setDrawer] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const lastLogin = me.account?.last_login_at
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(me.account.last_login_at),
      )
    : "Chưa ghi nhận";

  const signOutOthers = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Đã đăng xuất khỏi các thiết bị khác");
  };

  return (
    <SettingsSection
      id="security"
      icon={ShieldCheck}
      title="Bảo mật"
      description="Mật khẩu và phiên đăng nhập của tài khoản."
    >
      <SettingsRow label="Email đăng nhập">
        <span className="font-mono text-sm text-foreground">
          {me.account?.login_email ?? me.email}
        </span>
      </SettingsRow>

      <SettingsRow label="Lần đăng nhập gần nhất">
        <span className="text-sm text-muted-foreground">{lastLogin}</span>
      </SettingsRow>

      <SettingsRow
        label="Mật khẩu"
        hint="Nên dùng ít nhất 8 ký tự, có chữ hoa, số và ký tự đặc biệt."
      >
        <Button type="button" variant="outline" onClick={() => setDrawer(true)}>
          Đổi mật khẩu
        </Button>
      </SettingsRow>

      <SettingsRow
        label="Thiết bị khác"
        hint="Đăng xuất mọi phiên đăng nhập trên máy và trình duyệt khác. Phiên hiện tại giữ nguyên."
      >
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          className="text-destructive"
          onClick={() => setConfirmOpen(true)}
        >
          Đăng xuất thiết bị khác
        </Button>
      </SettingsRow>

      <PasswordDrawer open={drawer} onClose={() => setDrawer(false)} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đăng xuất khỏi các thiết bị khác?</AlertDialogTitle>
            <AlertDialogDescription>
              Mọi phiên đăng nhập trên máy và trình duyệt khác sẽ bị đăng xuất. Phiên hiện tại giữ
              nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void signOutOthers()}
            >
              Đăng xuất
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
