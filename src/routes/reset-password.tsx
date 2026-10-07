import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { routeAfterLogin } from "./login";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Đặt lại mật khẩu | The Mandarin League" },
      { name: "description", content: "Đặt mật khẩu mới cho tài khoản nội bộ TML." },
      { property: "og:title", content: "Đặt lại mật khẩu – TML" },
      { property: "og:description", content: "Đặt mật khẩu mới cho tài khoản nội bộ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => { if (s && (ev === "PASSWORD_RECOVERY" || ev === "SIGNED_IN")) setReady(true); });
    supabase.auth.getSession().then(({ data }) => setReady((r) => r || !!data.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold text-primary-deep">Đặt mật khẩu mới</h1>
        <div className="mt-6">
          {ready === null ? <p className="text-center text-sm text-muted-foreground">Đang kiểm tra liên kết…</p>
            : ready ? <NewPasswordForm onDone={async () => { const d = await routeAfterLogin(); navigate({ to: d === "blocked" || d === "none" || d === "/change-password" ? "/login" : d }); }} />
            : <p className="text-center text-sm text-muted-foreground">Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới tại trang đăng nhập.</p>}
        </div>
      </div>
    </section>
  );
}
