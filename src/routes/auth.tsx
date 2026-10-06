import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Đăng nhập quản trị | The Mandarin League" },
      { name: "description", content: "Đăng nhập dành cho quản trị viên The Mandarin League." },
      { property: "og:title", content: "Đăng nhập quản trị – TML" },
      { property: "og:description", content: "Khu vực dành riêng cho quản trị viên TML." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError("Email hoặc mật khẩu không đúng.");
    navigate({ to: "/admin/photos" });
  };

  return (
    <section className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-3xl font-bold text-primary-deep">Đăng nhập quản trị</h1>
      <p className="mt-2 text-sm text-muted-foreground">Chỉ dành cho quản trị viên TML.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-3" />
        <input type="password" required placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-3" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>
    </section>
  );
}
