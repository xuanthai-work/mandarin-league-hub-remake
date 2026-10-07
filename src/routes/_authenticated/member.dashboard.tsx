import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, Download, ExternalLink, Lock, LogOut, ShieldCheck } from "lucide-react";
import { MyDepartment } from "@/components/portal/MyDepartment";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/tml-logo.png.asset.json";
import { deptName } from "@/lib/recruitment";
import { SubmitReportDialog } from "@/components/portal/SubmitReportDialog";
import { TaskEvidence } from "@/components/portal/TaskEvidence";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { POINT_KIND, PRIORITY, TASK_STATUS, fmtDate, tierOf } from "@/lib/points";

export const Route = createFileRoute("/_authenticated/member/dashboard")({ staticData: { sitemap: false },
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
type Me = { email: string; roles?: string[]; account: { account_status: string; must_change_password: boolean } | null; member: Member | null };

function MemberDashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["my-account"], queryFn: async () => (await supabase.rpc("my_account")).data as unknown as Me });
  const avatar = useQuery({ queryKey: ["my-avatar", me.data?.member?.avatar_path], enabled: !!me.data?.member?.avatar_path,
    queryFn: async () => (await supabase.storage.from("avatars").createSignedUrl(me.data!.member!.avatar_path!, 3600)).data?.signedUrl ?? null });
  const canAdmin = !!me.data?.roles?.some((r) => r === "admin" || r === "department_head");
  const [tab, setTab] = useState<"card" | "tasks" | "points" | "dept">("card");
  const [qr, setQr] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const memberId = me.data?.member?.id;
  const tasks = useQuery({ queryKey: ["my-tasks", memberId], enabled: !!memberId, queryFn: async () =>
    (await supabase.from("tasks").select("*").eq("assignee_id", memberId!).order("created_at", { ascending: false })).data ?? [] });
  const history = useQuery({ queryKey: ["my-points", memberId], enabled: !!memberId, queryFn: async () =>
    (await supabase.from("point_transactions").select("*").eq("member_id", memberId!).order("created_at", { ascending: false })).data ?? [] });
  useEffect(() => { const c = me.data?.member?.member_code; if (c) QRCode.toDataURL(c, { margin: 0, width: 160 }).then(setQr); }, [me.data?.member?.member_code]);
  const [reporting, setReporting] = useState<{ id: string; title: string } | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  useEffect(() => { if (me.data?.member) setName(me.data.member.full_name); }, [me.data?.member]);
  useEffect(() => { if (me.data?.account?.must_change_password) navigate({ to: "/change-password", replace: true }); }, [me.data, navigate]);

  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/login", replace: true }); };

  if (me.isLoading) return <div className="portal-ai min-h-screen p-16 text-center portal-ink-muted">Đang tải…</div>;
  const m = me.data?.member;
  if (!m || me.data?.account?.account_status !== "active") return (
    <div className="portal-ai min-h-screen px-4 py-20 text-center"><div className="portal-glass mx-auto max-w-md rounded-2xl p-8">
      <h1 className="text-xl font-bold">Tài khoản không có hồ sơ thành viên hợp lệ</h1>
      <p className="mt-2 text-sm text-muted-foreground">Vui lòng liên hệ Ban Công nghệ & Hệ thống.</p>
      <button onClick={signOut} className="mt-6 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">Đăng xuất</button>
    </div></div>
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

  const tier = tierOf(m.contribution_points);
  const downloadCard = async () => {
    if (!cardRef.current) return;
    try { const url = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true }); const a = document.createElement("a"); a.href = url; a.download = `${m.member_code}.png`; a.click(); }
    catch { setErr("Không tải được thẻ, vui lòng thử lại."); }
  };
  const act = async (id: string, action: "start" | "submit", evidence = "", note = "") => {
    setErr(""); setMsg("");
    const { error } = await supabase.rpc("member_update_task", { _task: id, _action: action, _evidence: evidence, _note: note });
    if (error) setErr(error.message); else { setMsg(action === "submit" ? "Đã nộp báo cáo." : "Đã tiếp nhận nhiệm vụ."); setReporting(null); qc.invalidateQueries({ queryKey: ["my-tasks"] }); }
  };
  return (
    <div className="portal-ai min-h-screen"><div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="portal-ink flex items-center gap-2 text-2xl font-bold"><img src={logo.url} alt="TML" className="h-9 w-9 rounded-full border border-gold bg-background object-cover" />Cổng thành viên</h1>
        <div className="flex gap-2">
          {canAdmin && <Link to="/admin" className="inline-flex items-center gap-1 rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-primary-deep"><ShieldCheck className="h-4 w-4" />Vào Bàn Quản trị</Link>}
          <button onClick={signOut} className="portal-ink inline-flex items-center gap-1 rounded-lg border border-gold/40 px-3 py-2 text-sm hover:bg-primary/20"><LogOut className="h-4 w-4" />Đăng xuất</button>
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto border-b border-primary/30">
        {([["card", "Thẻ & Hồ sơ"], ["tasks", "Nhiệm vụ"], ["points", "Lịch sử điểm"], ["dept", "Ban của tôi"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? "border-gold text-gold" : "border-transparent portal-ink-muted"}`}>{l}</button>
        ))}
      </div>

      {msg && <p className="mt-4 rounded-lg bg-success/15 px-3 py-2 text-sm text-success">{msg}</p>}
      {err && <p className="mt-4 rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">{err}</p>}
      {tab === "card" && (
        <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_1fr]">
          <div>
          <div className="[perspective:1200px]">
          <div ref={cardRef} className="id-card relative overflow-hidden rounded-[18px] p-[3px] text-primary-foreground">
            <div className="id-card-inner relative overflow-hidden rounded-[15px] p-5">
              <div aria-hidden className="id-guilloche pointer-events-none absolute inset-0" />
              <img src={logo.url} alt="" aria-hidden className="pointer-events-none absolute -right-12 -bottom-12 h-56 w-56 rounded-full opacity-[0.07]" />
              <div className="relative flex items-center gap-3 border-b border-gold/40 pb-3">
                <img src={logo.url} alt="TML" className="h-11 w-11 rounded-full border-2 border-gold bg-background object-cover p-0.5" />
                <div className="min-w-0 leading-tight">
                  <p className="text-[13px] font-bold tracking-wide">THE MANDARIN LEAGUE</p>
                  <p className="text-[10px] text-gold">LIÊN ĐOÀN HÁN NGỮ · 普通话联盟</p>
                </div>
                <div aria-hidden className="id-chip ml-auto h-8 w-11 shrink-0 rounded-md" />
              </div>
              <p className="relative mt-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-gold/90">Member Identification Card · 会员证</p>
              <div className="relative mt-3 flex gap-4">
                <label className="group relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full border-[3px] border-gold bg-primary-deep ring-2 ring-gold/30 ring-offset-2 ring-offset-primary-deep">
                  {avatar.data ? <img src={avatar.data} alt={m.full_name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-3xl font-bold">{m.full_name.charAt(0)}</span>}
                  <span className="absolute inset-0 flex items-center justify-center bg-foreground/50 opacity-0 transition group-hover:opacity-100"><Camera className="h-5 w-5" /></span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                </label>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase tracking-wider opacity-70">Họ và tên / Name</p>
                  <p className="truncate text-lg font-bold uppercase">{m.full_name}</p>
                  <p className="font-mono text-sm tracking-wider text-gold">{m.member_code}</p>
                  <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tier.className}`}>{tier.label}</span>
                </div>
              </div>
              <div className="relative mt-4 flex items-end gap-3">
                <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div><dt className="text-[9px] uppercase opacity-70">Ban / Department</dt><dd className="font-semibold">{deptName(m.department)}</dd></div>
                  <div><dt className="text-[9px] uppercase opacity-70">Chức vụ / Position</dt><dd className="font-semibold">{m.position}</dd></div>
                  <div><dt className="text-[9px] uppercase opacity-70">Ngày cấp / Issued</dt><dd>{new Date(m.joined_on).toLocaleDateString("vi-VN")}</dd></div>
                  <div><dt className="text-[9px] uppercase opacity-70">Điểm / Credits</dt><dd className="font-bold text-gold">{m.contribution_points}</dd></div>
                </dl>
                {qr && <img src={qr} alt={`QR ${m.member_code}`} className="h-[72px] w-[72px] shrink-0 rounded-md border border-gold bg-card p-1" />}
              </div>
              <div className="relative mt-4 flex items-center justify-between gap-3">
                <div aria-hidden className="id-barcode h-7 flex-1 rounded-sm" />
                <span className="rotate-[-8deg] rounded-full border-2 border-gold/60 px-2 py-0.5 text-[9px] font-bold tracking-widest text-gold/80">TML VERIFIED</span>
              </div>
            </div>
          </div>
          </div>
          <button onClick={downloadCard} className="portal-ink mt-3 inline-flex items-center gap-1 rounded-lg border border-gold/40 px-3 py-2 text-sm hover:bg-primary/20"><Download className="h-4 w-4" />Tải thẻ ảnh</button>
          </div>

          <div className="space-y-6">
            <section className="portal-glass rounded-2xl p-5">
              <h2 className="font-semibold">Hiển thị công khai</h2>
              <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={(m as { is_public?: boolean }).is_public !== false} onChange={async (e) => {
                const { error } = await supabase.rpc("set_my_visibility", { _public: e.target.checked });
                if (error) setErr(error.message); else { setMsg("Đã cập nhật tùy chọn hiển thị."); qc.invalidateQueries({ queryKey: ["my-account"] }); }
              }} />Hiện tên tôi trên trang Cơ cấu tổ chức (nếu là Trưởng/Phó Ban)</label>
            </section>
            <section className="portal-glass rounded-2xl p-5">
              <h2 className="font-semibold">Thông tin cá nhân</h2>
              <label className="mt-3 block text-xs text-muted-foreground">Họ và tên
                <input className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></label>
              <button onClick={saveName} className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Lưu họ tên</button>
              <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Mã thành viên, Ban, Chức vụ và Điểm do TML quản lý.</p>
            </section>
            <section className="portal-glass rounded-2xl p-5">
              <h2 className="mb-3 font-semibold">Đổi mật khẩu</h2>
              <NewPasswordForm requireCurrent onDone={() => setMsg("Đã đổi mật khẩu.")} />
            </section>
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <div className="mt-6 space-y-3">
          {(tasks.data ?? []).length === 0 && <p className="portal-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Chưa có nhiệm vụ nào được giao.</p>}
          {(tasks.data ?? []).map((t) => (
            <article key={t.id} className="portal-glass rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{t.title}</h3>
                  <p className="text-xs text-muted-foreground">Ưu tiên {PRIORITY[t.priority]} · Hạn {fmtDate(t.due_on)} · <span className="font-semibold text-gold">+{t.points} điểm</span></p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TASK_STATUS[t.status]?.className}`}>{TASK_STATUS[t.status]?.label}</span>
              </div>
              {t.description && <p className="mt-2 whitespace-pre-line text-sm">{t.description}</p>}
              {t.review_note && <p className="mt-2 rounded-lg bg-secondary p-2 text-xs">Phản hồi: {t.review_note}</p>}
              {t.evidence_url && <TaskEvidence value={t.evidence_url} note={t.report_note} />}
              <div className="mt-3 flex gap-2">
                {["assigned", "revision"].includes(t.status) && <button onClick={() => act(t.id, "start")} className="rounded-lg border border-border px-3 py-1.5 text-xs">Tiếp nhận</button>}
                {["assigned", "in_progress", "revision"].includes(t.status) && <button onClick={() => setReporting({ id: t.id, title: t.title })} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Nộp báo cáo</button>}
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "points" && (
        <div className="mt-6 space-y-4">
          <div className="portal-glass flex items-center justify-between rounded-2xl p-5">
            <div><p className="text-sm text-muted-foreground">Tổng điểm đóng góp</p><p className="text-3xl font-bold text-gold">{m.contribution_points}</p></div>
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${tier.className}`}>{tier.label}</span>
          </div>
          <ol className="portal-glass divide-y divide-border rounded-2xl">
            {(history.data ?? []).length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Chưa có lịch sử điểm.</li>}
            {(history.data ?? []).map((h) => (
              <li key={h.id} className="flex items-center gap-3 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{h.reason}</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("vi-VN")} · {POINT_KIND[h.kind] ?? h.kind} · Số dư {h.balance_after}</p>
                </div>
                <span className={`font-bold ${h.delta >= 0 ? "text-success" : "text-destructive"}`}>{h.delta > 0 ? `+${h.delta}` : h.delta}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {reporting && <SubmitReportDialog title={reporting.title} onClose={() => setReporting(null)} onSubmit={(ev, n) => act(reporting.id, "submit", ev, n)} />}
    </div></div>
  );
}
