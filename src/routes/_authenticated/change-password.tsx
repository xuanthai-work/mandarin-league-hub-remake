import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { routeAfterLogin } from "../login";

export const Route = createFileRoute("/_authenticated/change-password")({
  head: () => ({
    meta: [
      { title: "Đổi mật khẩu lần đầu | The Mandarin League" },
      { name: "description", content: "Đặt mật khẩu riêng trước khi vào khu vực nội bộ TML." },
      { property: "og:title", content: "Đổi mật khẩu – TML" },
      { property: "og:description", content: "Đặt mật khẩu riêng cho tài khoản nội bộ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChangePassword,
});

function ChangePassword() {
  const navigate = useNavigate();
  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 text-center text-2xl font-bold text-primary-deep">Đặt mật khẩu riêng</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Bạn đang dùng mật khẩu tạm thời. Hãy đặt mật khẩu mới để tiếp tục.</p>
        <div className="mt-6"><NewPasswordForm onDone={async () => { const d = await routeAfterLogin(); navigate({ to: d === "blocked" || d === "none" || d === "/change-password" ? "/login" : d }); }} /></div>
      </div>
    </section>
  );
}
