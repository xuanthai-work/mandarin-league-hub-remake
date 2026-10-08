import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { KeyRound, Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createAccount, listAccounts, resetAccountPassword, updateAccount } from "@/lib/accounts.functions";
import { ACCESS_LABELS, ACCOUNT_DEPTS, ACCOUNT_STATUS, PERMISSIONS, PERMISSION_TEMPLATES, positionsFor, type AccessLevel, type AccountStatus } from "@/lib/accounts";
import { deptName } from "@/lib/recruitment";

export const Route = createFileRoute("/_authenticated/admin/accounts")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Tài khoản nội bộ | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: AccountsPage,
});

const inp = "rounded-lg border border-input bg-background px-3 py-2 text-sm";
const statusTone: Record<string, string> = { active: "bg-success/15 text-success", inactive: "bg-secondary", suspended: "bg-warning-soft text-foreground", disabled: "bg-destructive/10 text-destructive" };

function randomPassword() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  return Array.from(crypto.getRandomValues(new Uint32Array(12)), (n) => c[n % c.length]).join("");
}

type Acct = Awaited<ReturnType<typeof listAccounts>>[number];

function AccountsPage() {
  const list = useServerFn(listAccounts);
  const q = useQuery({ queryKey: ["admin-accounts"], queryFn: () => list() });
  const [f, setF] = useState({ q: "", dept: "", status: "" });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Acct | null>(null);
  const rows = useMemo(() => (q.data ?? []).filter((a) => {
    const t = f.q.toLowerCase();
    return (!t || [a.member?.full_name, a.member?.member_code, a.login_email].some((v) => v?.toLowerCase().includes(t)))
      && (!f.dept || a.member?.department === f.dept) && (!f.status || a.account_status === f.status);
  }), [q.data, f]);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-primary-deep">Tài khoản nội bộ</h1>
          <p className="text-sm text-muted-foreground">Không có tự đăng ký — chỉ Quản trị viên cấp tài khoản.</p></div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Tạo tài khoản</button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <input className={inp} placeholder="Tìm tên, mã, email…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <select className={inp} value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })}><option value="">Mọi Ban</option>{ACCOUNT_DEPTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <select className={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Mọi trạng thái</option>{Object.entries(ACCOUNT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      {q.error && <p className="mt-4 text-sm text-destructive">{(q.error as Error).message}</p>}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground"><tr>{["Họ tên", "Mã thành viên", "Email", "Ban", "Chức vụ", "Quyền", "Trạng thái", "Ngày tạo", "Đăng nhập gần nhất"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Đang tải…</td></tr>}
            {!q.isLoading && rows.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Chưa có tài khoản nội bộ nào.</td></tr>}
            {rows.map((a) => (
              <tr key={a.user_id} onClick={() => setEditing(a)} className="cursor-pointer border-t border-border hover:bg-accent/50">
                <td className="p-3 font-medium">{a.member?.full_name}</td>
                <td className="p-3 font-mono text-xs text-primary">{a.member?.member_code}</td>
                <td className="p-3">{a.login_email}</td>
                <td className="p-3">{deptName(a.member?.department ?? null)}</td>
                <td className="p-3">{a.member?.position}</td>
                <td className="p-3">{ACCESS_LABELS[a.access as AccessLevel]?.split(" (")[0]}</td>
                <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs ${statusTone[a.account_status]}`}>{ACCOUNT_STATUS[a.account_status as AccountStatus]}</span></td>
                <td className="p-3 text-xs">{new Date(a.created_at).toLocaleDateString("vi-VN")}</td>
                <td className="p-3 text-xs">{a.last_login_at ? new Date(a.last_login_at).toLocaleString("vi-VN") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && <CreateDrawer onClose={() => setCreating(false)} />}
      {editing && <EditDrawer acct={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-lg overflow-y-auto bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button aria-label="Đóng" onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function RoleFields({ v, set }: { v: { department: string; position: string; access: AccessLevel; permissions: string[] }; set: (p: Partial<typeof v>) => void }) {
  return (
    <>
      <label className="block text-xs text-muted-foreground">Ban
        <select className={`${inp} mt-1 w-full`} value={v.department} onChange={(e) => set({ department: e.target.value, position: positionsFor(e.target.value)[0]! })}>{ACCOUNT_DEPTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <label className="block text-xs text-muted-foreground">Chức vụ
        <select className={`${inp} mt-1 w-full`} value={v.position} onChange={(e) => set({ position: e.target.value })}>{positionsFor(v.department).map((p) => <option key={p}>{p}</option>)}</select></label>
      <label className="block text-xs text-muted-foreground">Quyền truy cập
        <select className={`${inp} mt-1 w-full`} value={v.access} onChange={(e) => { const a = e.target.value as AccessLevel; set({ access: a, permissions: PERMISSION_TEMPLATES[a] }); }}>{Object.entries(ACCESS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <fieldset className="rounded-lg border border-border p-3">
        <legend className="px-1 text-xs text-muted-foreground">Quyền chi tiết</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {PERMISSIONS.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.permissions.includes(k)} onChange={(e) => set({ permissions: e.target.checked ? [...v.permissions, k] : v.permissions.filter((x) => x !== k) })} />{l}</label>)}
        </div>
      </fieldset>
    </>
  );
}

function CreateDrawer({ onClose, presetMemberId }: { onClose: () => void; presetMemberId?: string }) {
  const qc = useQueryClient();
  const create = useServerFn(createAccount);
  const { data: members } = useQuery({ queryKey: ["members-unlinked"], queryFn: async () => {
    const [{ data: m }, { data: a }] = await Promise.all([supabase.from("members").select("id, member_code, full_name, email, department, position").order("created_at", { ascending: false }), supabase.from("member_accounts").select("member_id")]);
    const linked = new Set((a ?? []).map((x) => x.member_id));
    return (m ?? []).filter((x) => !linked.has(x.id));
  } });
  const [v, setV] = useState({ memberId: presetMemberId ?? "", full_name: "", phone: "", email: "", password: randomPassword(), department: "executive", position: "Co-founder", access: "member" as AccessLevel, permissions: PERMISSION_TEMPLATES.member as string[], status: "active" as AccountStatus, mustChange: true });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const set = (p: Partial<typeof v>) => setV((s) => ({ ...s, ...p }));
  const pick = (id: string) => { const m = members?.find((x) => x.id === id); set({ memberId: id, ...(m ? { email: m.email || v.email, department: m.department, position: m.position } : {}) }); };

  const submit = async () => {
    setBusy(true); setErr("");
    const email = (v.email ?? "").replace(/[\s\u200B-\u200D\uFEFF]/g, "").toLowerCase();
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) { setErr("Email đăng nhập không hợp lệ. Vui lòng nhập dạng ten@gmail.com."); setBusy(false); return; }
    if (!v.memberId && v.full_name.trim().length < 2) { setErr("Vui lòng nhập Họ và tên (ít nhất 2 ký tự)."); setBusy(false); return; }
    if (v.password.length < 8) { setErr("Mật khẩu tạm thời cần ít nhất 8 ký tự."); setBusy(false); return; }
    try {
      await create({ data: { memberId: v.memberId || undefined, newMember: v.memberId ? undefined : { full_name: v.full_name, phone: v.phone }, email, password: v.password, department: v.department, position: v.position, access: v.access, permissions: v.permissions, status: v.status, mustChange: v.mustChange } });
      set({ email }); qc.invalidateQueries({ queryKey: ["admin-accounts"] }); qc.invalidateQueries({ queryKey: ["admin-members"] }); setDone(true);
    } catch (e) {
      const msg = (e as Error).message;
      setErr(msg.trim().startsWith("[") ? "Thông tin chưa hợp lệ, vui lòng kiểm tra Email, Họ tên và Mật khẩu." : msg);
    }
    setBusy(false);
  };

  if (done) return (
    <Drawer title="Đã tạo tài khoản" onClose={onClose}>
      <p className="text-sm">Gửi thông tin đăng nhập cho thành viên qua kênh riêng. Mật khẩu này sẽ không hiển thị lại.</p>
      <div className="mt-3 rounded-lg bg-secondary p-3 font-mono text-sm">Email: {v.email}<br />Mật khẩu tạm thời: {v.password}<br />Đăng nhập: {typeof window !== "undefined" ? window.location.origin : ""}/login</div>
      <button onClick={onClose} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Xong</button>
    </Drawer>
  );

  return (
    <Drawer title="Tạo tài khoản nội bộ" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs text-muted-foreground">Thành viên
          <select className={`${inp} mt-1 w-full`} value={v.memberId} onChange={(e) => pick(e.target.value)}>
            <option value="">+ Tạo hồ sơ thành viên mới</option>
            {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.member_code} — {m.full_name}</option>)}
          </select></label>
        {!v.memberId && <div className="grid grid-cols-2 gap-2"><input className={inp} placeholder="Họ và tên" value={v.full_name} onChange={(e) => set({ full_name: e.target.value })} /><input className={inp} placeholder="Số điện thoại" value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></div>}
        <input className={`${inp} w-full`} type="email" placeholder="Email đăng nhập" value={v.email} onChange={(e) => set({ email: e.target.value })} />
        <div className="flex gap-2"><input className={`${inp} flex-1 font-mono`} placeholder="Mật khẩu tạm thời" value={v.password} onChange={(e) => set({ password: e.target.value })} />
          <button type="button" onClick={() => set({ password: randomPassword() })} className="rounded-lg border border-border px-3 text-sm">Tạo ngẫu nhiên</button></div>
        <RoleFields v={v} set={set} />
        <label className="block text-xs text-muted-foreground">Trạng thái tài khoản
          <select className={`${inp} mt-1 w-full`} value={v.status} onChange={(e) => set({ status: e.target.value as AccountStatus })}>{Object.entries(ACCOUNT_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.mustChange} onChange={(e) => set({ mustChange: e.target.checked })} />Yêu cầu đổi mật khẩu khi đăng nhập lần đầu</label>
        {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        <button disabled={busy} onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Tạo tài khoản</button>
      </div>
    </Drawer>
  );
}

export { CreateDrawer };

function EditDrawer({ acct, onClose }: { acct: Acct; onClose: () => void }) {
  const qc = useQueryClient();
  const update = useServerFn(updateAccount);
  const reset = useServerFn(resetAccountPassword);
  const [v, setV] = useState({ department: acct.member.department, position: acct.member.position, access: acct.access as AccessLevel, permissions: acct.permissions, status: acct.account_status as AccountStatus });
  const [pw, setPw] = useState(randomPassword());
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState<string | null>(null);
  const set = (p: Partial<typeof v>) => setV((s) => ({ ...s, ...p }));
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key); setErr(""); setMsg("");
    try { await fn(); setMsg(ok); qc.invalidateQueries({ queryKey: ["admin-accounts"] }); } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  };
  const save = (status = v.status) => run("save", () => update({ data: { userId: acct.user_id, ...v, status } }).then(() => set({ status })), "Đã lưu thay đổi.");

  return (
    <Drawer title={acct.member.full_name} onClose={onClose}>
      <p className="font-mono text-sm text-primary">{acct.member.member_code}</p>
      <p className="text-sm text-muted-foreground">{acct.login_email}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {v.status !== "active" && <button onClick={() => save("active")} className="rounded-lg border border-success px-3 py-1.5 text-sm text-success">Kích hoạt</button>}
        {v.status !== "suspended" && <button onClick={() => save("suspended")} className="rounded-lg border border-border px-3 py-1.5 text-sm">Tạm khóa</button>}
        {v.status !== "disabled" && <button onClick={() => save("disabled")} className="rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive">Vô hiệu hóa</button>}
      </div>
      <div className="mt-4 space-y-3">
        <RoleFields v={v} set={set} />
        <button disabled={!!busy} onClick={() => save()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Lưu quyền & chức vụ</button>
      </div>
      <h3 className="mt-6 flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4" />Mật khẩu</h3>
      <div className="mt-2 flex gap-2"><input className={`${inp} flex-1 font-mono`} value={pw} onChange={(e) => setPw(e.target.value)} />
        <button disabled={!!busy} onClick={() => run("pw", () => reset({ data: { userId: acct.user_id, mode: "temp", password: pw } }), `Đã đặt mật khẩu tạm thời: ${pw} — thành viên phải đổi khi đăng nhập.`)} className="rounded-lg border border-border px-3 text-sm">Đặt lại</button></div>
      <button disabled={!!busy} onClick={() => run("link", () => reset({ data: { userId: acct.user_id, mode: "link", redirectTo: `${window.location.origin}/reset-password` } }), "Đã gửi liên kết đặt lại mật khẩu tới email.")} className="mt-2 text-sm text-primary underline">Gửi liên kết đặt lại mật khẩu qua email</button>
      {msg && <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{msg}</p>}
      {err && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
    </Drawer>
  );
}
