import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/tml-logo.png.asset.json";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Đăng nhập quản trị | The Mandarin League" },
      { name: "description", content: "Đăng nhập dành cho đội ngũ quản trị The Mandarin League." },
      { property: "og:title", content: "Đăng nhập quản trị – TML" },
      { property: "og:description", content: "Khu vực dành riêng cho đội ngũ TML." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError("Email hoặc mật khẩu không đúng.");
    navigate({ to: "/admin" });
  };

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <img src={logo.url} alt="TML" className="mx-auto h-16 w-16 object-contain" />
        <h1 className="mt-4 text-center text-2xl font-bold text-primary-deep">Đăng nhập quản trị</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Chỉ dành cho tài khoản đã được TML cấp quyền.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-3" />
          <input type="password" required autoComplete="current-password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-3" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60">
            <Lock className="h-4 w-4" /> {busy ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
      </div>
    </section>
  );
}
