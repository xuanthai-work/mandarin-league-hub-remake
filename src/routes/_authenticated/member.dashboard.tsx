import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, Download, ExternalLink, Lock, LogOut, ShieldCheck } from "lucide-react";
import { MyDepartment } from "@/components/portal/MyDepartment";
import { MyBenefits } from "@/components/portal/MyBenefits";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/tml-logo.png.asset.json";
import { deptName } from "@/lib/recruitment";
import { SubmitReportDialog } from "@/components/portal/SubmitReportDialog";
import { TaskEvidence } from "@/components/portal/TaskEvidence";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import type React from "react";
import { POINT_KIND, PRIORITY, TASK_STATUS, TIERS, fmtDate, isLeader, tierOf } from "@/lib/points";
const TONE: Record<string, string> = { bronze: "blue", silver: "green", gold: "wine", platinum: "purple" };
import { TierBadge, TierProgress } from "@/components/TierBadge";

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
  const canAdmin = !!me.data?.roles?.some((r) => r === "admin" || r === "department_head" || r === "deputy_head");
  const [tab, setTab] = useState<"card" | "tasks" | "points" | "dept" | "benefits">("card");
  const [qr, setQr] = useState("");
  const [barcode, setBarcode] = useState("");
  useEffect(() => { const c = me.data?.member?.member_code; if (!c) return;
    const cv = document.createElement("canvas"); JsBarcode(cv, c, { format: "CODE128", displayValue: false, margin: 0, height: 40, width: 1.4 }); setBarcode(cv.toDataURL("image/png")); }, [me.data?.member?.member_code]);
  const cardRef = useRef<HTMLDivElement>(null);
  const memberId = me.data?.member?.id;
  const advisor = useQuery({ queryKey: ["my-advisor", memberId], enabled: !!memberId, queryFn: async () => (await supabase.rpc("my_advisor_roles")).data ?? [] });
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
  const [congrats, setCongrats] = useState<string | null>(null);
  useEffect(() => { const mm = me.data?.member; if (!mm) return;
    const t = tierOf(mm.contribution_points); const idx = TIERS.length - TIERS.indexOf(t);
    const key = `tml_tier_seen_${mm.member_code}`; const prev = Number(localStorage.getItem(key) ?? 0);
    if (prev && idx > prev) setCongrats(t.label);
    if (idx !== prev) localStorage.setItem(key, String(Math.max(idx, prev ? idx : idx)));
  }, [me.data?.member]);

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
  const special = isLeader(m, me.data?.roles ?? [], (advisor.data ?? []).length > 0) && m.position !== "Thành viên";
  const tone = special ? "black" : TONE[tier.key] ?? "blue";
  const downloadCard = async () => {
    if (!cardRef.current) return;
    const el = cardRef.current; el.classList.add("is-exporting");
    try { const url = await toPng(el, { pixelRatio: 2, cacheBust: true }); const a = document.createElement("a"); a.href = url; a.download = `${m.member_code}.png`; a.click(); }
    catch { setErr("Không tải được thẻ, vui lòng thử lại."); } finally { el.classList.remove("is-exporting"); }
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
        {([["card", "Thẻ & Hồ sơ"], ["tasks", "Nhiệm vụ"], ["points", "Lịch sử điểm"], ["dept", "Ban của tôi"], ["benefits", "Quyền lợi"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? "border-gold text-gold" : "border-transparent portal-ink-muted"}`}>{l}</button>
        ))}
      </div>

      {msg && <p className="mt-4 rounded-lg bg-success/15 px-3 py-2 text-sm text-success">{msg}</p>}
      {err && <p className="mt-4 rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">{err}</p>}
      {congrats && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={() => setCongrats(null)}>
          <div className="tml-pass-pop portal-glass max-w-sm rounded-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-fit"><TierBadge tierKey={tier.key} size={88} /></div>
            <p className="mt-4 text-lg font-bold text-primary-deep">Chúc mừng bạn đã đạt cấp bậc thành viên mới tại The Mandarin League!</p>
            <p className="mt-1 text-sm font-semibold text-gold">{congrats}</p>
            <button onClick={() => setCongrats(null)} className="mt-5 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Tuyệt vời</button>
          </div>
        </div>
      )}
      {tab === "card" && (
        <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_1fr]">
          <div>
          <div className="[perspective:1200px]">
          <div ref={cardRef} data-tone={tone} style={{ "--pass-c": `var(--pass-${tone})` } as React.CSSProperties}
            onPointerMove={(e) => { if (e.pointerType !== "mouse") return; const r = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
              e.currentTarget.style.setProperty("--ry", `${(x * 10).toFixed(2)}deg`); e.currentTarget.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`); e.currentTarget.style.setProperty("--lift", "-4px"); }}
            onPointerLeave={(e) => { ["--rx", "--ry", "--lift"].forEach((p) => e.currentTarget.style.removeProperty(p)); }}
            className="tml-pass relative overflow-hidden rounded-[18px] text-primary-deep">
            <div aria-hidden className="tml-microprint pointer-events-none absolute inset-0" />
            <div aria-hidden className="tml-pass-pattern pointer-events-none absolute inset-0" />
            <div aria-hidden className="tml-pass-glow pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-gold/40" />
            <img src={logo.url} alt="" aria-hidden className="pointer-events-none absolute left-[30%] top-[38%] h-48 w-48 rounded-full opacity-[0.06]" />
            <div className="relative flex items-center gap-2 pl-4 pt-4">
              <img src={logo.url} alt="TML" className="h-12 w-12 shrink-0 rounded-full border-2 border-gold bg-background object-cover p-0.5" />
              <div className="min-w-0 leading-tight">
                <p className="font-serif text-[15px] font-bold tracking-wide text-primary">普通话联盟</p>
                <p className="text-[10px] font-semibold tracking-wide">The Mandarin League</p>
                <p className="text-[8px] uppercase tracking-[0.2em] opacity-70">Liên Đoàn Hán Ngữ</p>
              </div>
              <div className="tml-banner ml-auto flex h-10 flex-1 items-center justify-end pr-4 sm:max-w-[48%]">
                <div className="text-right leading-none text-primary-foreground"><p className="text-lg font-bold tracking-[0.2em]">会员证</p><p className="mt-0.5 text-[8px] tracking-[0.25em] text-gold">THẺ THÀNH VIÊN</p></div>
              </div>
            </div>
            <div className="relative grid grid-cols-[1fr_auto] gap-3 px-4 pb-4 pt-3">
              <dl className="space-y-1.5 text-[11px]">
                <div><dt className="text-[9px] opacity-60">姓名 · Họ và tên</dt><dd className="truncate text-base font-bold uppercase text-primary">{m.full_name}</dd></div>
                {barcode && <img src={barcode} alt={`Mã vạch ${m.member_code}`} className="h-9 max-w-[190px] bg-background px-1" />}
                {(() => {
                  const adv = (advisor.data ?? []).map((a) => deptName(a.dept).replace(/^Ban\s+/, "").split(/\s*&\s*/)[0]);
                  const mainAdvisor = m.position === "Cố vấn chuyên môn";
                  const dept = mainAdvisor && adv.length ? (adv.length === 1 ? deptName((advisor.data ?? [])[0]?.dept ?? "") : adv.join(" · ")) : deptName(m.department);
                  return <>
                    <div><dt className="text-[9px] opacity-60">部门 · Ban</dt><dd className="truncate font-semibold">{dept}</dd></div>
                    <div><dt className="text-[9px] opacity-60">职务 · Chức vụ</dt><dd className="truncate font-semibold">
                      {mainAdvisor ? <span className="text-gold">Cố vấn chuyên môn</span>
                        : adv.length ? <>{m.position} · <span className="text-gold">Cố vấn {adv.join(" · ")}</span></> : m.position}
                    </dd></div>
                  </>;
                })()}
                <div className="flex gap-4"><div><dt className="text-[9px] opacity-60">入会 · Gia nhập</dt><dd className="font-mono">{new Date(m.joined_on).toLocaleDateString("vi-VN")}</dd></div>
                  <div><dt className="text-[9px] opacity-60">等级 · Hạng</dt><dd className="flex items-center gap-1"><span key={tier.key} className="tml-pass-pop inline-flex"><TierBadge tierKey={tier.key} size={22} /></span><span className={`inline-block rounded-full border px-1.5 text-[9px] font-semibold ${tier.className}`}>{tier.label}</span></dd></div></div>
              </dl>
              <div className="flex flex-col items-center">
                <label className="group relative h-[120px] w-[92px] cursor-pointer overflow-hidden rounded-md border-2 border-background bg-secondary shadow-md ring-1 ring-gold/60">
                  {avatar.data ? <img src={avatar.data} alt={m.full_name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-3xl font-bold text-primary">{m.full_name.charAt(0)}</span>}
                  <span className="absolute inset-0 flex items-center justify-center bg-foreground/50 text-background opacity-0 transition group-hover:opacity-100"><Camera className="h-5 w-5" /></span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                </label>
                {qr && <img src={qr} alt={`QR ${m.member_code}`} className="mt-2 h-14 w-14 rounded bg-background p-0.5" />}
                <p className="mt-1 font-mono text-[9px] font-bold tracking-wider text-primary">{m.member_code}</p>
              </div>
            </div>
            <div className="relative flex items-center justify-between bg-primary-deep px-4 py-1.5 text-[8px] tracking-[0.3em] text-gold"><span>THEMANDARINLEAGUE.BOND</span><span>TML VERIFIED</span></div>
          </div>
          </div>
          <div className="portal-glass mt-3 rounded-2xl px-5 py-4">
            <p className="text-xs portal-ink-muted">Điểm cống hiến · Credits</p>
            <p className="text-3xl font-bold text-gold">{m.contribution_points.toLocaleString("vi-VN")} <span className="text-base font-medium portal-ink-muted">điểm</span></p>
          </div>
          <TierProgress points={m.contribution_points} />
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
                  {t.assigned_by_name && <p className="text-xs text-muted-foreground">Người giao: <b className="text-foreground">{t.assigned_by_name}</b>{t.assigned_by_note && ` — ${t.assigned_by_note}`}</p>}
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
      {tab === "dept" && <MyDepartment canManage={canAdmin} />}
      {tab === "benefits" && <MyBenefits />}
      {reporting && <SubmitReportDialog title={reporting.title} onClose={() => setReporting(null)} onSubmit={(ev, n) => act(reporting.id, "submit", ev, n)} />}
    </div></div>
  );
}
