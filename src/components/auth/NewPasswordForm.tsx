import { useState } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Sets a new password for the current session, then clears the first-login flag. */
export function NewPasswordForm({ onDone, requireCurrent }: { onDone: () => void; requireCurrent?: boolean }) {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const inp = "w-full rounded-lg border border-input bg-background px-4 py-3";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (pw.length < 8) return setErr("Mật khẩu mới tối thiểu 8 ký tự.");
    if (pw !== pw2) return setErr("Mật khẩu xác nhận không khớp.");
    setBusy(true);
    if (requireCurrent) {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.auth.signInWithPassword({ email: u.user?.email ?? "", password: cur });
      if (error) { setBusy(false); return setErr("Mật khẩu hiện tại không đúng."); }
    }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setBusy(false); return setErr(/same|different/i.test(error.message) ? "Mật khẩu mới phải khác mật khẩu cũ." : "Không đổi được mật khẩu: " + error.message); }
    await supabase.rpc("mark_password_changed");
    setBusy(false); setCur(""); setPw(""); setPw2("");
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {requireCurrent && <input type="password" required autoComplete="current-password" placeholder="Mật khẩu hiện tại" value={cur} onChange={(e) => setCur(e.target.value)} className={inp} />}
      <input type="password" required minLength={8} autoComplete="new-password" placeholder="Mật khẩu mới (≥ 8 ký tự)" value={pw} onChange={(e) => setPw(e.target.value)} className={inp} />
      <input type="password" required minLength={8} autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inp} />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60">
        <KeyRound className="h-4 w-4" /> {busy ? "Đang lưu…" : "Lưu mật khẩu mới"}
      </button>
    </form>
  );
}
