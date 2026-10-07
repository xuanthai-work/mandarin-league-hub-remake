import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Camera, Lock, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/tml-logo.png.asset.json";
import { deptName } from "@/lib/recruitment";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

export const Route = createFileRoute("/_authenticated/member/dashboard")({
  head: () => ({
    meta: [
      { title: "Cổng thành viên | The Mandarin League" },
      { name: "description", content: "Thẻ thành viên và thông tin nội bộ của thành viên TML." },
      { property: "og:title", content: "Cổng thành viên – TML" },
      { property: "og:description", content: "Khu vực nội bộ dành cho thành viên TML." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemberDashboard,
});

type Member = { id: string; member_code: string; full_name: string; department: string; position: string; joined_on: string; contribution_points: number; avatar_path: string | null; status: string };
type Me = { email: string; account: { account_status: string; must_change_password: boolean } | null; member: Member | null };

function MemberDashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["my-account"], queryFn: async () => (await supabase.rpc("my_account")).data as unknown as Me });
  const avatar = useQuery({ queryKey: ["my-avatar", me.data?.member?.avatar_path], enabled: !!me.data?.member?.avatar_path,
    queryFn: async () => (await supabase.storage.from("avatars").createSignedUrl(me.data!.member!.avatar_path!, 3600)).data?.signedUrl ?? null });
  const [tab, setTab] = useState<"card" | "tasks">("card");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  useEffect(() => { if (me.data?.member) setName(me.data.member.full_name); }, [me.data?.member]);
  useEffect(() => { if (me.data?.account?.must_change_password) navigate({ to: "/change-password", replace: true }); }, [me.data, navigate]);

  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/login", replace: true }); };

  if (me.isLoading) return <p className="p-16 text-center text-muted-foreground">Đang tải…</p>;
  const m = me.data?.member;
  if (!m || me.data?.account?.account_status !== "active") return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-bold">Tài khoản không có hồ sơ thành viên hợp lệ</h1>
      <p className="mt-2 text-sm text-muted-foreground">Vui lòng liên hệ Ban Công nghệ & Hệ thống.</p>
      <button onClick={signOut} className="mt-6 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">Đăng xuất</button>
    </div>
  );

  const saveName = async () => {
    setErr(""); setMsg("");
    const { error } = await supabase.rpc("update_my_profile", { _full_name: name, _avatar_path: null as unknown as string });
    if (error) setErr(error.message); else { setMsg("Đã cập nhật họ tên."); qc.invalidateQueries({ queryKey: ["my-account"] }); }
  };
  const uploadAvatar = async (file: File) => {
    setErr(""); setMsg("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) return setErr("Ảnh phải là PNG/JPG/WEBP và ≤ 3MB.");
    const { data: u } = await supabase.auth.getUser();
    const path = `${u.user!.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return setErr("Không tải được ảnh: " + error.message);
    const { error: e2 } = await supabase.rpc("update_my_profile", { _full_name: m.full_name, _avatar_path: path });
    if (e2) setErr(e2.message); else { setMsg("Đã cập nhật ảnh đại diện."); qc.invalidateQueries({ queryKey: ["my-account"] }); }
  };

  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(m.member_code)}`;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-deep">Cổng thành viên</h1>
        <button onClick={signOut} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><LogOut className="h-4 w-4" />Đăng xuất</button>
      </div>
      <div className="mt-4 flex gap-2 border-b border-border">
        {([["card", "Thẻ & Hồ sơ"], ["tasks", "Nhiệm vụ & Điểm"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      {tab === "card" ? (
        <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl border-2 border-gold bg-gradient-brand p-6 text-primary-foreground shadow-lg">
            <img src={logo.url} alt="" aria-hidden className="pointer-events-none absolute -right-10 -bottom-10 h-56 w-56 opacity-10" />
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold"><img src={logo.url} alt="TML" className="h-6 w-6" />The Mandarin League</div>
            <div className="mt-5 flex items-center gap-4">
              <label className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-gold bg-primary-deep">
                {avatar.data ? <img src={avatar.data} alt={m.full_name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-2xl font-bold">{m.full_name.charAt(0)}</span>}
                <span className="absolute inset-0 flex items-center justify-center bg-foreground/50 opacity-0 transition group-hover:opacity-100"><Camera className="h-5 w-5" /></span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
              </label>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold">{m.full_name}</p>
                <p className="font-mono text-sm text-gold">{m.member_code}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs opacity-70">Ban</dt><dd className="font-medium">{deptName(m.department)}</dd></div>
              <div><dt className="text-xs opacity-70">Chức vụ</dt><dd className="font-medium">{m.position}</dd></div>
              <div><dt className="text-xs opacity-70">Ngày gia nhập</dt><dd>{new Date(m.joined_on).toLocaleDateString("vi-VN")}</dd></div>
              <div><dt className="text-xs opacity-70">Điểm đóng góp</dt><dd className="text-lg font-bold text-gold">{m.contribution_points}</dd></div>
            </dl>
            <img src={qr} alt={`QR ${m.member_code}`} className="absolute right-5 top-5 h-16 w-16 rounded bg-card p-1" />
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold">Thông tin cá nhân</h2>
              <label className="mt-3 block text-xs text-muted-foreground">Họ và tên
                <input className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></label>
              <button onClick={saveName} className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Lưu họ tên</button>
              <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Mã thành viên, Ban, Chức vụ và Điểm do TML quản lý.</p>
              {msg && <p className="mt-2 text-sm text-success">{msg}</p>}
              {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
            </section>
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 font-semibold">Đổi mật khẩu</h2>
              <NewPasswordForm requireCurrent onDone={() => setMsg("Đã đổi mật khẩu.")} />
            </section>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-3xl font-bold text-gold">{m.contribution_points}</p>
          <p className="text-sm text-muted-foreground">điểm đóng góp</p>
          <p className="mt-4 text-sm text-muted-foreground">Chưa có nhiệm vụ nào được giao. Mô-đun Nhiệm vụ sẽ được bổ sung ở giai đoạn sau.</p>
        </div>
      )}
    </div>
  );
}
