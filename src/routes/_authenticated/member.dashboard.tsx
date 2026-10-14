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
import { DongSonDrum as DongSon, LacBirds, FLOCK_H, FLOCK_V } from "@/components/portal/PassOrnaments";

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
  const [savedImg, setSavedImg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  useEffect(() => { if (me.data?.member) setName(me.data.member.full_name); }, [me.data?.member]);
  useEffect(() => { if (me.data?.account?.must_change_password) navigate({ to: "/change-password", replace: true }); }, [me.data, navigate]);
  const [congrats, setCongrats] = useState<string | null>(null);
  const [previewTone, setPreviewTone] = useState<string | null>(null);
  const [layout, setLayout] = useState<"h" | "v">("h");
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

  const realTier = tierOf(m.contribution_points);
  const special = isLeader(m, me.data?.roles ?? [], (advisor.data ?? []).length > 0) && m.position !== "Thành viên";
  const previewTier = previewTone && previewTone !== "black" ? TIERS.find((t) => TONE[t.key] === previewTone) : undefined;
  const tier = previewTier ?? realTier;
  const tone = previewTone ?? (special ? "black" : TONE[realTier.key] ?? "blue");
  const advNames = (advisor.data ?? []).map((a) => deptName(a.dept).replace(/^Ban\s+/, "").split(/\s*&\s*/)[0]);
  const mainAdvisor = m.position === "Cố vấn chuyên môn";
  const deptLabel = mainAdvisor && advNames.length ? (advNames.length === 1 ? deptName((advisor.data ?? [])[0]?.dept ?? "") : advNames.join(" · ")) : deptName(m.department);
  const posLabel = mainAdvisor ? <span className="text-gold">Cố vấn chuyên môn</span>
    : advNames.length ? <>{m.position} · <span className="text-gold">Cố vấn {advNames.join(" · ")}</span></> : m.position;
  const joined = new Date(m.joined_on).toLocaleDateString("vi-VN");
  const tierEl = <><span key={tier.key} className="tml-pass-pop inline-flex"><TierBadge tierKey={tier.key} size={22} /></span><span className={`inline-block rounded-full border px-1.5 text-[9px] font-semibold ${tier.className}`}>{tier.label}</span></>;
  const avatarEl = (size: string) => (
    <label className={`group relative ${size} cursor-pointer overflow-hidden rounded-md border-2 border-background bg-secondary shadow-md ring-1 ring-gold/60`}>
      {avatar.data ? <img src={avatar.data} alt={m.full_name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-3xl font-bold text-primary">{m.full_name.charAt(0)}</span>}
      <span className="absolute inset-0 flex items-center justify-center bg-foreground/50 text-background opacity-0 transition group-hover:opacity-100"><Camera className="h-5 w-5" /></span>
      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
    </label>
  );
  const downloadCard = async () => {
    if (!cardRef.current) return;
    const el = cardRef.current; el.classList.add("is-exporting"); setErr("");
    const fileName = `${m.member_code}-${layout === "v" ? "vertical" : "horizontal"}.png`;
    try {
      // Inline the signed avatar as a data URL so export never hits CORS/cache-bust issues on mobile.
      const imgs = Array.from(el.querySelectorAll("img"));
      const originals = new Map<HTMLImageElement, string>();
      await Promise.all(imgs.map(async (img) => {
        if (!img.src.startsWith("http")) return;
        try { const b = await (await fetch(img.src, { mode: "cors" })).blob();
          const d = await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(b); });
          originals.set(img, img.src); img.src = d; await img.decode().catch(() => {}); } catch { /* keep original */ }
      }));
      const ratio = Math.min(2.5, Math.max(2, window.devicePixelRatio || 2));
      let url = "";
      try { url = await toPng(el, { pixelRatio: ratio }); url = await toPng(el, { pixelRatio: ratio }); } // second pass fixes blank images on Safari
      finally { originals.forEach((src, img) => { img.src = src; }); }
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Thẻ thành viên TML" }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
      }
      if (isMobile) { setSavedImg(url); return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch { setErr("Không tải được thẻ, vui lòng thử lại."); } finally { el.classList.remove("is-exporting"); }
  };
  const act = async (id: string, action: "start" | "submit", evidence = "", note = "") => {
    setErr(""); setMsg("");
    const { error } = await supabase.rpc("member_update_task", { _task: id, _action: action, _evidence: evidence, _note: note });
    if (error) setErr(error.message); else { setMsg(action === "submit" ? "Đã nộp báo cáo." : "Đã tiếp nhận nhiệm vụ."); setReporting(null); qc.invalidateQueries({ queryKey: ["my-tasks"] }); }
  };
  return (
    <div className="portal-ai min-h-screen"><div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="portal-ink flex items-center gap-2 text-2xl font-bold"><img src={logo.url} alt="TML" className="h-9 w-9 rounded-full border border-gold bg-background object-cover" />Cổng thành viên
          <button type="button" onClick={() => setTab("card")} title="Mở thẻ thành viên" style={{ "--pass-c": `var(--pass-${tone})` } as React.CSSProperties}
            className="tml-pass relative ml-1 inline-flex items-center gap-1.5 overflow-hidden rounded-full py-1 pl-1 pr-3 text-xs font-semibold text-primary-deep">
            <span aria-hidden className="tml-pass-glow pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-gold/50" />
            <span key={tier.key} className="tml-pass-pop relative inline-flex"><TierBadge tierKey={tier.key} size={24} /></span>
            <span className="relative">{tier.label}</span>
          </button>
        </h1>
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
          <div className="mb-3 inline-flex rounded-full border border-gold/40 p-1 text-xs" role="tablist" aria-label="Kiểu thẻ">
            {([["h", "Thẻ ngang"], ["v", "Thẻ đứng"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={layout === k} onClick={() => setLayout(k)}
                className={`rounded-full px-4 py-1.5 font-semibold ${layout === k ? "bg-gold text-primary-deep" : "portal-ink-muted"}`}>{l}</button>
            ))}
          </div>
          <div className={`[perspective:1200px] ${layout === "v" ? "mx-auto max-w-[300px]" : ""}`}>
          <div ref={cardRef} data-tone={tone} style={{ "--pass-c": `var(--pass-${tone})` } as React.CSSProperties}
            onPointerMove={(e) => { if (e.pointerType !== "mouse") return; const r = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
              e.currentTarget.style.setProperty("--ry", `${(x * 10).toFixed(2)}deg`); e.currentTarget.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`); e.currentTarget.style.setProperty("--lift", "-4px"); }}
            onPointerLeave={(e) => { ["--rx", "--ry", "--lift"].forEach((p) => e.currentTarget.style.removeProperty(p)); }}
            className={`tml-pass relative overflow-hidden rounded-[18px] text-primary-deep ${layout === "v" ? "flex aspect-[54/86] flex-col" : ""}`}>
            <div aria-hidden className="tml-microprint pointer-events-none absolute inset-0" />
            <div aria-hidden className="tml-pass-pattern pointer-events-none absolute inset-0" />
            <div aria-hidden className="tml-pass-glow pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-gold/40" />
            {layout === "h" ? <>
            <DongSon className="-bottom-20 -left-14 h-60 w-60" />
            <LacBirds flock={FLOCK_H} />
            <div className="relative flex items-center gap-2 pl-4 pt-4">
              <img src={logo.url} alt="TML" className="h-12 w-12 shrink-0 rounded-full border-2 border-gold bg-background object-cover p-0.5" />
              <div className="min-w-0 leading-tight">
                <p className="font-serif text-[15px] font-bold tracking-wide text-primary">普通话联盟</p>
                <p className="text-[10px] font-semibold tracking-wide">The Mandarin League</p>
                <p className="text-[8px] uppercase tracking-[0.08em] opacity-70">Liên Đoàn Hán Ngữ</p>
              </div>
              <div className="tml-banner ml-auto flex h-10 flex-1 items-center justify-end pr-4 sm:max-w-[48%]">
                <div className="text-right leading-none text-primary-foreground"><p className="text-lg font-bold tracking-[0.08em]">会员证</p><p className="mt-0.5 text-[8px] tracking-[0.08em] text-gold">THẺ THÀNH VIÊN</p></div>
              </div>
            </div>
            <div className="relative grid grid-cols-[1fr_auto] gap-3 px-4 pb-4 pt-3">
              <dl className="space-y-1.5 text-[11px]">
                <div><dt className="text-[9px] opacity-60">姓名 · Họ và tên</dt><dd className="truncate text-base font-bold uppercase text-primary">{m.full_name}</dd></div>
                {barcode && <img src={barcode} alt={`Mã vạch ${m.member_code}`} className="h-9 max-w-[190px] bg-background px-1" />}
                <div><dt className="text-[9px] opacity-60">部门 · Ban</dt><dd className="truncate font-semibold">{deptLabel}</dd></div>
                <div><dt className="text-[9px] opacity-60">职务 · Chức vụ</dt><dd className="truncate font-semibold">{posLabel}</dd></div>
                <div className="flex gap-4"><div><dt className="text-[9px] opacity-60">入会 · Gia nhập</dt><dd className="font-mono">{joined}</dd></div>
                  <div><dt className="text-[9px] opacity-60">等级 · Hạng</dt><dd className="flex items-center gap-1">{tierEl}</dd></div></div>
              </dl>
              <div className="flex flex-col items-center">
                {avatarEl("h-[120px] w-[92px]")}
                {qr && <img src={qr} alt={`QR ${m.member_code}`} className="mt-2 h-14 w-14 rounded bg-background p-0.5" />}
                <p className="mt-1 font-mono text-[9px] font-bold tracking-wider text-primary">{m.member_code}</p>
              </div>
            </div>
            <div className="tml-pass-foot flex items-center justify-between px-4 py-1.5 text-[8px] tracking-[0.08em]"><span>THEMANDARINLEAGUE.BOND</span><span>TML VERIFIED</span></div>
            </> : <>
            <DongSon className="-bottom-24 left-1/2 h-[280px] w-[280px] -translate-x-1/2" />
            <LacBirds flock={FLOCK_V} />
            <div aria-hidden className="tml-pass-vframe" />
            <div className="tml-vhead relative flex items-center gap-2 px-4 pb-3 pt-3">
              <div className="min-w-0 flex-1 leading-tight">
                <p className="font-serif text-[15px] font-bold tracking-wide text-gold">普通话联盟</p>
                <p className="text-[10px] font-semibold tracking-wide text-primary-foreground">THE MANDARIN LEAGUE</p>
                <p className="text-[8px] tracking-[0.08em] text-gold">会员证 · THẺ THÀNH VIÊN</p>
              </div>
              <img src={logo.url} alt="TML" className="h-11 w-11 shrink-0 rounded-full border-2 border-gold bg-background object-cover p-0.5" />
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col items-center px-4 pt-2 text-center">
              {avatarEl("h-[108px] w-[86px]")}
              <p className="mt-2 w-full truncate text-base font-bold uppercase text-primary">{m.full_name}</p>
              <p className="font-mono text-[10px] font-bold tracking-wider text-primary">{m.member_code}</p>
              <dl className="mt-1.5 w-full space-y-1 text-[11px]">
                <div><dt className="text-[9px]">部门 · Ban</dt><dd className="truncate font-semibold">{deptLabel}</dd></div>
                <div><dt className="text-[9px]">职务 · Chức vụ</dt><dd className="truncate font-semibold">{posLabel}</dd></div>
                <div className="flex justify-center gap-4"><div><dt className="text-[9px]">入会</dt><dd className="font-mono">{joined}</dd></div>
                  <div><dt className="text-[9px]">等级 · Hạng</dt><dd className="flex items-center justify-center gap-1">{tierEl}</dd></div></div>
              </dl>
              {qr && <img src={qr} alt={`QR ${m.member_code}`} className="mb-2 mt-auto h-11 w-11 rounded bg-background p-0.5" />}
            </div>
            <div className="tml-pass-foot flex flex-col items-center py-1.5 text-[7px] tracking-[0.08em]"><span>THEMANDARINLEAGUE.BOND</span><span>TML VERIFIED</span></div>
            </>}
          </div>
          </div>
          <div className="portal-glass mt-3 rounded-2xl px-5 py-4">
            <p className="text-xs portal-ink-muted">Điểm cống hiến · Credits</p>
            <p className="text-3xl font-bold text-gold">{m.contribution_points.toLocaleString("vi-VN")} <span className="text-base font-medium portal-ink-muted">điểm</span></p>
          </div>
          <TierProgress points={m.contribution_points} />
          <button onClick={downloadCard} className="portal-ink mt-3 inline-flex items-center gap-1 rounded-lg border border-gold/40 px-3 py-2 text-sm hover:bg-primary/20"><Download className="h-4 w-4" />Tải thẻ ảnh</button>
          {me.data?.roles?.includes("admin") && (
            <div className="portal-glass mt-3 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gold">Xem trước màu thẻ (chỉ Admin thấy, không đổi điểm thật)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([["blue", "Tập sự"], ["green", "Tích cực"], ["wine", "Nòng cốt"], ["purple", "Tinh hoa"], ["black", "Lãnh đạo / Cố vấn"]] as const).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setPreviewTone(k)} style={{ background: `var(--pass-${k})` }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground ring-2 ${previewTone === k ? "ring-gold" : "ring-transparent"}`}>{l}</button>
                ))}
                <button type="button" onClick={() => setPreviewTone(null)} className="portal-ink rounded-full border border-gold/40 px-3 py-1 text-xs">Mặc định</button>
                <button type="button" onClick={() => setCongrats(tier.label)} className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-primary-deep">Thử hiệu ứng lên bậc</button>
              </div>
            </div>
          )}
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
      {savedImg && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-foreground/80 p-4" onClick={() => setSavedImg(null)}>
          <img src={savedImg} alt="Thẻ thành viên" className="max-h-[75vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
          <p className="text-center text-sm text-background">Nhấn giữ ảnh rồi chọn “Lưu vào Ảnh” để lưu thẻ về máy.</p>
          <button onClick={() => setSavedImg(null)} className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-primary-deep">Đóng</button>
        </div>
      )}
    </div></div>
  );
}
