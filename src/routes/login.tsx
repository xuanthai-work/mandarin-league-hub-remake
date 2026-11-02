import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { routeAfterLogin } from "@/lib/portal";

export const Route = createFileRoute("/login")({ staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { next?: "library-access" } => search["next"] === "library-access" ? { next: "library-access" } : {},
  head: () => ({
    meta: [
      { title: "Cổng nội bộ | The Mandarin League" },
      { name: "description", content: "Đăng nhập Cổng nội bộ dành cho tài khoản do The Mandarin League cấp." },
      { property: "og:title", content: "Cổng nội bộ – TML" },
      { property: "og:description", content: "Chỉ dành cho tài khoản do TML cấp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setInfo("");
    if (mode === "forgot") {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setBusy(false);
      return setInfo("Nếu email đã được TML cấp tài khoản, bạn sẽ nhận được liên kết đặt lại mật khẩu.");
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      return setError(/banned/i.test(error.message)
        ? "Tài khoản đã bị tạm khóa hoặc vô hiệu hóa. Vui lòng liên hệ Ban Điều hành."
        : "Email hoặc mật khẩu không đúng.");
    }
    const dest = await routeAfterLogin();
    setBusy(false);
    if (dest === "blocked" || dest === "none") {
      await supabase.auth.signOut();
      return setError(dest === "blocked" ? "Tài khoản đã bị tạm khóa hoặc vô hiệu hóa. Vui lòng liên hệ Ban Điều hành." : "Tài khoản chưa được TML cấp quyền truy cập nội bộ.");
    }
    navigate({ to: next === "library-access" && dest !== "/change-password" ? "/library-access" : dest });
  };

  const inp = "w-full rounded-lg border border-input bg-background px-4 py-3";
  return (
    <section className="portal-ai flex min-h-screen items-center justify-center px-4 py-16">
      <div className="portal-glass mx-auto w-full max-w-md rounded-2xl p-8">
        <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">TML · Internal Portal</p>
        <img src="/logo.svg" alt="TML" className="mx-auto h-16 w-16 rounded-full border-2 border-[#00adef] bg-background object-cover shadow-md" />
        <h1 className="mt-4 text-center text-2xl font-bold text-primary-deep">{mode === "login" ? "Cổng nội bộ" : "Quên mật khẩu"}</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Chỉ dành cho tài khoản do TML cấp.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input type="email" required autoComplete="email" placeholder="Email đăng nhập" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} />
          {mode === "login" && <input type="password" required autoComplete="current-password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} className={inp} />}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-success">{info}</p>}
          <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60">
            {mode === "login" ? <Lock className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {busy ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Gửi liên kết đặt lại"}
          </button>
        </form>
        <button onClick={() => { setMode(mode === "login" ? "forgot" : "login"); setError(""); setInfo(""); }} className="mt-4 w-full text-center text-sm text-primary underline">
          {mode === "login" ? "Quên mật khẩu?" : "Quay lại đăng nhập"}
        </button>
      </div>
    </section>
  );
}
