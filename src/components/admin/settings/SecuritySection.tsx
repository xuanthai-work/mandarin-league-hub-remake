import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
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
  return (
    <AnimatePresence>
      {open && (
        <AdminDrawer width="sm" title="Đổi mật khẩu" onClose={onClose} bodyClassName="space-y-4">
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
        </AdminDrawer>
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
