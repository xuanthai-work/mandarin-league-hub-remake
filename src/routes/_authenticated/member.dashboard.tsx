import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, Check, Copy, Download, Lock, LogOut, Nfc, Pencil, RotateCcw, RotateCw, ShieldCheck, X } from "lucide-react";
import { MyDepartment } from "@/components/portal/MyDepartment";
import { MyBenefits } from "@/components/portal/MyBenefits";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { deptName } from "@/lib/recruitment";
import { SubmitReportDialog } from "@/components/portal/SubmitReportDialog";
import { TaskEvidence } from "@/components/portal/TaskEvidence";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import type React from "react";
import { LEADER_TONE, POINT_KIND, PRIORITY, TASK_STATUS, TIERS, fmtDate, isLeader, tierOf } from "@/lib/points";
import { TierBadge, TierProgress } from "@/components/TierBadge";
import { DongSonDrum as DongSon, LacBirds, FLOCK_H } from "@/components/portal/PassOrnaments";

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
type Sheet = "name" | "qr" | "dept_tasks" | "points_benefits" | null;

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

/** Gold EMV chip + contactless mark: the "smart card" cue on the pass. */
function SmartChip({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 28" className={className} role="presentation" aria-hidden>
      <defs>
        <linearGradient id="tml-emv-chip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="35" height="27" rx="4" fill="url(#tml-emv-chip)" stroke="#92400e" strokeOpacity=".5" />
      <g fill="none" stroke="#7c4a03" strokeOpacity=".55" strokeWidth="1">
        <path d="M0 9h10M0 19h10M26 9h10M26 19h10M10 1v26M26 1v26" />
        <rect x="10" y="6" width="16" height="16" rx="2.5" />
      </g>
    </svg>
  );
}

function SheetDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="portal-glass mx-auto my-6 w-full max-w-2xl rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-primary-deep">{title}</h2>
          <button onClick={onClose} aria-label="Đóng" className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function MemberDashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["my-account"], queryFn: async () => (await supabase.rpc("my_account")).data as unknown as Me });
  const avatar = useQuery({ queryKey: ["my-avatar", me.data?.member?.avatar_path], enabled: !!me.data?.member?.avatar_path,
    queryFn: async () => (await supabase.storage.from("avatars").createSignedUrl(me.data!.member!.avatar_path!, 3600)).data?.signedUrl ?? null });
  const canAdmin = !!me.data?.roles?.some((r) => r === "admin" || r === "department_head" || r === "deputy_head");
  const [isFlipped, setIsFlipped] = useState(false);
  const [flatten, setFlatten] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [copied, setCopied] = useState(false);
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
  const pass = useQuery({ queryKey: ["my-pass", memberId], enabled: !!memberId, queryFn: async () => ((await supabase.rpc("my_pass")).data ?? [])[0] ?? null });
  useEffect(() => { const t = pass.data?.pass_token; if (!t) { setQr(""); return; }
    QRCode.toDataURL(`https://member.themandarinleague.bond/library-access?pass=${t}`, { margin: 0, width: 200, errorCorrectionLevel: "M" }).then(setQr); }, [pass.data?.pass_token]);
  const [reporting, setReporting] = useState<{ id: string; title: string } | null>(null);
  const [savedImg, setSavedImg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  useEffect(() => { if (me.data?.member) setName(me.data.member.full_name); }, [me.data?.member]);
  useEffect(() => { if (me.data?.account?.must_change_password) navigate({ to: "/change-password", replace: true }); }, [me.data, navigate]);
  const [congrats, setCongrats] = useState<string | null>(null);
  const [previewTone, setPreviewTone] = useState<string | null>(null);
  useEffect(() => { const mm = me.data?.member; if (!mm) return;
    const t = tierOf(mm.contribution_points); const idx = TIERS.length - TIERS.indexOf(t);
    const key = `tml_tier_seen_${mm.member_code}`; const prev = Number(localStorage.getItem(key) ?? 0);
    if (prev && idx > prev) setCongrats(t.label);
    if (idx !== prev) localStorage.setItem(key, String(Math.max(idx, prev ? idx : idx)));
  }, [me.data?.member]);
  useEffect(() => { setCopied(false); }, [sheet]);

  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/login", replace: true }); };

  if (me.isLoading) return <div className="portal-ai min-h-screen p-16 text-center portal-ink-muted">Đang tải…</div>;
  const m = me.data?.member;
  if (!m || me.data?.account?.account_status !== "active") return (
    <div className="portal-ai min-h-screen px-4 py-20 text-center"><div className="portal-glass mx-auto max-w-md rounded-2xl p-8">
      <h1 className="text-xl font-bold">Tài khoản không có hồ sơ thành viên hợp lệ</h1>
      <p className="mt-2 text-sm text-muted-foreground">Vui lòng liên hệ Ban Công nghệ &amp; Hệ thống.</p>
      <button onClick={signOut} className="mt-6 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">Đăng xuất</button>
    </div></div>
  );

  const saveName = async () => {
    setErr(""); setMsg("");
    const { error } = await supabase.rpc("update_my_profile", { _full_name: name, _avatar_path: null as unknown as string });
    if (error) setErr(error.message);
    else { setMsg("Đã cập nhật họ tên."); setSheet(null); qc.invalidateQueries({ queryKey: ["my-account"] }); }
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
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(m.member_code); setCopied(true); }
    catch { setErr("Không sao chép được mã thành viên."); }
  };

  const realTier = tierOf(m.contribution_points);
  const special = isLeader(m, me.data?.roles ?? [], (advisor.data ?? []).length > 0) && m.position !== "Thành viên";
  const previewTier = previewTone && previewTone !== "black" ? TIERS.find((t) => t.tone === previewTone) : undefined;
  const tier = previewTier ?? realTier;
  const tone = previewTone ?? (special ? "black" : realTier.tone);
  const advNames = (advisor.data ?? []).map((a) => deptName(a.dept).replace(/^Ban\s+/, "").split(/\s*&\s*/)[0]);
  const mainAdvisor = m.position === "Cố vấn chuyên môn";
  const deptLabel = mainAdvisor && advNames.length ? (advNames.length === 1 ? deptName((advisor.data ?? [])[0]?.dept ?? "") : advNames.join(" · ")) : deptName(m.department);
  const posLabel = mainAdvisor ? <span className="text-gold">Cố vấn chuyên môn</span>
    : advNames.length ? <>{m.position} · <span className="text-gold">Cố vấn {advNames.join(" · ")}</span></> : m.position;
  const joined = new Date(m.joined_on).toLocaleDateString("vi-VN");
  const tierEl = <><span key={tier.key} className="tml-pass-pop inline-flex"><TierBadge tierKey={tone === "black" ? "leader" : tier.key} size={22} /></span><span className={`inline-block rounded-full border px-1.5 text-[9px] font-semibold ${tier.className}`}>{tier.label}</span></>;
  const avatarEl = (size: string) => (
    <label className={`group relative ${size} shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-background bg-secondary shadow-md ring-1 ring-gold/60`}>
      {avatar.data ? <img src={avatar.data} alt={m.full_name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-3xl font-bold text-primary">{m.full_name.charAt(0)}</span>}
      <span className="absolute inset-0 flex items-center justify-center bg-foreground/50 text-background opacity-0 transition group-hover:opacity-100"><Camera className="h-5 w-5" /></span>
      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
    </label>
  );
  const watermark = (
    <img src="/logo.svg" alt="" aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.07] grayscale contrast-125" />
  );
  const downloadCard = async () => {
    if (!cardRef.current) return;
    const restoreFront = isFlipped;
    setErr("");
    if (restoreFront) { setFlatten(true); setIsFlipped(false); await nextFrame(); }
    const el = cardRef.current; el.classList.add("is-exporting");
    const fileName = `${m.member_code}-member-pass.png`;
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
    } catch { setErr("Không tải được thẻ, vui lòng thử lại."); }
    finally {
      el.classList.remove("is-exporting");
      if (restoreFront) { setFlatten(false); setIsFlipped(true); }
    }
  };
  const act = async (id: string, action: "start" | "submit", evidence = "", note = "") => {
    setErr(""); setMsg("");
    const { error } = await supabase.rpc("member_update_task", { _task: id, _action: action, _evidence: evidence, _note: note });
    if (error) setErr(error.message); else { setMsg(action === "submit" ? "Đã nộp báo cáo." : "Đã tiếp nhận nhiệm vụ."); setReporting(null); qc.invalidateQueries({ queryKey: ["my-tasks"] }); }
  };

  const dockItem = "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white";
  const labelCls = "text-[8px] uppercase tracking-wider opacity-60";

  const taskList = (
    <div className="space-y-3">
      {(tasks.data ?? []).length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Chưa có nhiệm vụ nào được giao.</p>}
      {(tasks.data ?? []).map((t) => (
        <article key={t.id} className="rounded-xl border border-border p-4">
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
  );

  const pointHistory = (
    <ol className="divide-y divide-border rounded-xl border border-border">
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
  );

  return (
    <div className="portal-ai min-h-screen"><div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-center gap-2 text-center text-xl font-bold portal-ink sm:text-2xl">
        <img src="/logo.svg" alt="TML" className="h-9 w-9 rounded-full border border-gold bg-background object-cover" />Cổng thành viên
      </div>

      {msg && <p className="mx-auto mt-4 max-w-xl rounded-lg bg-success/20 px-3 py-2 text-center text-sm text-success">{msg}</p>}
      {err && <p className="mx-auto mt-4 max-w-xl rounded-lg bg-destructive/20 px-3 py-2 text-center text-sm text-destructive">{err}</p>}

      {congrats && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={() => setCongrats(null)}>
          <div className="tml-pass-pop portal-glass max-w-sm rounded-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-fit"><TierBadge tierKey={tone === "black" ? "leader" : tier.key} size={88} /></div>
            <p className="mt-4 text-lg font-bold text-primary-deep">Chúc mừng bạn đã đạt cấp bậc thành viên mới tại The Mandarin League!</p>
            <p className="mt-1 text-sm font-semibold text-gold">{congrats}</p>
            <button onClick={() => setCongrats(null)} className="mt-5 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Tuyệt vời</button>
          </div>
        </div>
      )}

      {/* ===== The pass: single horizontal ID-1 flip card ===== */}
      <div className="flip-scene mt-6 flex justify-center">
        <div className="w-full max-w-[520px] sm:max-w-[560px] lg:[zoom:1.2]">
        <div
          className={`flip-inner w-full ${isFlipped ? "is-flipped" : ""} ${flatten ? "is-flat" : ""}`}
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse" || isFlipped) return;
            const r = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
            e.currentTarget.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
            e.currentTarget.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
            e.currentTarget.style.setProperty("--lift", "-4px");
          }}
          onPointerLeave={(e) => { ["--rx", "--ry", "--lift"].forEach((p) => e.currentTarget.style.removeProperty(p)); }}
        >
          {/* ---------- FRONT ---------- */}
          <div ref={cardRef} data-tone={tone} style={{ "--pass-c": `var(--pass-${tone})` } as React.CSSProperties}
            className="flip-face tml-pass relative flex aspect-[85.6/54] flex-col overflow-hidden rounded-[18px] text-primary-deep">
            <div aria-hidden className="tml-microprint pointer-events-none absolute inset-0" />
            <div aria-hidden className="tml-pass-pattern pointer-events-none absolute inset-0" />
            <div aria-hidden className="tml-pass-glow pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-gold/40" />
            {watermark}
            <span aria-hidden className="pointer-events-none absolute inset-0 select-none opacity-40">
              <DongSon className="-bottom-24 -left-24 h-64 w-64" />
            </span>
            <LacBirds flock={FLOCK_H} />
            {/* header */}
            <div className="relative flex shrink-0 items-center gap-2.5 px-4 pt-3">
              <img src="/logo.svg" alt="TML" className="h-10 w-10 shrink-0 rounded-full border-2 border-gold bg-background object-cover p-0.5 shadow-sm" />
              <div className="min-w-0 leading-tight">
                <p className="font-serif text-[14px] font-bold tracking-wide text-primary">普通话联盟</p>
                <p className="text-[10px] font-semibold tracking-wide">The Mandarin League</p>
                <p className="text-[8px] uppercase tracking-[0.08em] opacity-70">Liên Đoàn Hán Ngữ</p>
              </div>
              <div className="tml-banner ml-auto flex h-11 flex-1 flex-col items-end justify-center pb-1.5 pr-3 pt-1 sm:max-w-[46%]">
                <p className="text-base font-bold leading-none tracking-[0.1em] text-primary-foreground sm:text-lg">会员证</p>
                <p className="mt-1 text-[8px] font-semibold leading-none tracking-[0.1em] text-gold sm:text-[9px]">THẺ THÀNH VIÊN</p>
              </div>
            </div>
            {/* body — info left, portrait right (aligned to the same 16px content box) */}
            <div className="relative flex min-h-0 flex-1 px-4 pb-2 pt-1">
              <div className="grid w-full grid-cols-[1fr_auto] gap-4">
                <div className="flex min-w-0 flex-col">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <SmartChip className="h-6 w-8" />
                    <Nfc className="h-3.5 w-3.5 opacity-60" />
                    <button type="button" onClick={() => setSheet("qr")} className="font-mono text-[10px] font-bold tracking-[0.16em] text-primary" title="Mã thành viên">{m.member_code}</button>
                    <span className="text-[9px] opacity-40">•</span>
                    <button type="button" onClick={() => setSheet("points_benefits")} className="text-[10px] font-semibold text-primary" title="Cấp bậc, điểm & quyền lợi">{m.contribution_points.toLocaleString("vi-VN")} điểm</button>
                  </div>
                  <div className="mt-2 flex min-h-0 flex-1 flex-col">
                    <p className={`${labelCls} mt-3`}>姓名 · Họ và tên</p>
                    <div className="flex min-h-0 flex-1 items-center">
                      <button type="button" onClick={() => setSheet("name")} className="group/name flex w-full min-w-0 items-start gap-1.5 text-left" title="Sửa họ tên">
                        <span className={`min-w-0 whitespace-normal break-words hyphens-none font-bold uppercase leading-[1.2] tracking-tight text-primary ${m.full_name.length > 26 ? "text-[20px]" : m.full_name.length > 18 ? "text-[24px]" : m.full_name.length > 12 ? "text-[29px]" : "text-[34px]"}`}>{m.full_name}</span>
                        <Pencil className="mt-2 h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover/name:opacity-70" />
                      </button>
                    </div>
                  </div>
                  <dl className="mt-auto flex flex-col gap-y-2.5 pb-0.5 text-[10px] leading-tight">
                    <div className="min-w-0">
                      <dt className={labelCls}>部门 · Ban</dt>
                      <dd className="truncate">
                        <button type="button" onClick={() => setSheet("dept_tasks")} title="Xem Ban & nhiệm vụ" className="max-w-full truncate text-left font-semibold hover:text-primary">{deptLabel}</button>
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className={labelCls}>职务 · Chức vụ</dt>
                      <dd className="truncate">
                        <button type="button" onClick={() => setSheet("points_benefits")} title="Xem cấp bậc, điểm & quyền lợi" className="max-w-full truncate text-left font-semibold hover:text-primary">{posLabel}</button>
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className={labelCls}>等级 · Hạng</dt>
                      <dd>
                        <button type="button" onClick={() => setSheet("points_benefits")} title="Xem cấp bậc, điểm & quyền lợi" className="flex items-center gap-1">{tierEl}</button>
                      </dd>
                    </div>
                    <div>
                      <dt className={labelCls}>入会 · Gia nhập</dt>
                      <dd className="font-mono text-[9px]">{joined}</dd>
                    </div>
                  </dl>
                </div>
                <div className="flex items-start justify-center">
                  {avatarEl("h-[140px] w-[105px]")}
                </div>
              </div>
            </div>
            <div className="tml-pass-foot relative flex shrink-0 items-center justify-between gap-2 px-4 py-1 text-[8px] tracking-[0.08em]">
              <span className="truncate">THE MANDARIN LEAGUE · VERIFIED MEMBER PASS</span>
              <button type="button" onClick={() => setIsFlipped(true)} aria-label="Xem mặt sau thẻ" title="Xem mặt sau thẻ"
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-gold/60 bg-white/80 p-1.5 text-primary-deep shadow-sm transition hover:scale-105 hover:bg-white">
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ---------- BACK (luxury security & settings) ---------- */}
          <div data-tone={tone} style={{ "--pass-c": `var(--pass-${tone})` } as React.CSSProperties}
            aria-hidden={!isFlipped}
            className="flip-face back tml-pass tml-pass-back flex flex-col overflow-hidden rounded-[18px] text-primary-deep">
            <div aria-hidden className="tml-pass-glow pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-gold/40" />
            {watermark}
            <div className="h-8 w-full shrink-0 border-y border-gold/30 bg-neutral-900 shadow-inner sm:h-9" />
            <div className="relative flex shrink-0 items-center gap-2 px-3 pt-1.5">
              <button type="button" onClick={() => setIsFlipped(false)} aria-label="Quay lại mặt trước" title="Quay lại mặt trước"
                className="rounded-full border border-gold/50 bg-white/80 p-1 text-primary-deep transition hover:bg-white">
                <RotateCcw className="h-3 w-3" />
              </button>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em]">Cài đặt &amp; bảo mật tài khoản</p>
                <p className="truncate font-mono text-[8px] opacity-70">{m.member_code} · {tier.label}</p>
              </div>
              <span aria-label="Tem bảo an TML" title="Tem bảo an TML" className="ml-auto inline-block h-6 w-6 shrink-0 rounded-full"
                style={{ background: "conic-gradient(from 0deg,#dbeafe,#fde68a,#bbf7d0,#fbcfe8,#dbeafe)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.18)" }} />
            </div>
            <div className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-1 pt-1.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="relative overflow-hidden rounded-md border border-neutral-300 bg-[repeating-linear-gradient(45deg,#ffffff_0_6px,#eef2f7_6px_12px)] px-2 py-1">
                    <p className="font-mono text-[9px] font-bold tracking-[0.18em] text-neutral-700">{m.member_code}</p>
                    <p className="text-[7px] uppercase tracking-[0.14em] text-neutral-500">Authorized signature · TML</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {qr && <button type="button" onClick={() => setSheet("qr")} aria-label="Phóng to mã QR" title="Mã QR thư viện số">
                      <img src={qr} alt={`QR ${m.member_code}`} className="h-16 w-16 rounded-[6px] border border-gold/60 bg-white p-1" />
                    </button>}
                    <div className="min-w-0">
                      <p className="text-[7px] uppercase tracking-[0.14em] opacity-60">QR thư viện số</p>
                      <p className="truncate font-mono text-[8px] font-bold tracking-[0.12em]">{m.member_code}</p>
                      <button type="button" onClick={copyCode} className="mt-0.5 text-[8px] font-semibold text-primary underline-offset-2 hover:underline">{copied ? "Đã sao chép" : "Sao chép mã"}</button>
                    </div>
                  </div>
                  <label className="flex items-start gap-2 text-[10px] font-semibold leading-snug">
                    <input type="checkbox" className="mt-0.5 h-3 w-3 shrink-0 accent-[var(--pass-c)]"
                      checked={(m as { is_public?: boolean }).is_public !== false}
                      onChange={async (e) => {
                        const { error } = await supabase.rpc("set_my_visibility", { _public: e.target.checked });
                        if (error) setErr(error.message); else { setMsg("Đã cập nhật tùy chọn hiển thị."); qc.invalidateQueries({ queryKey: ["my-account"] }); }
                      }} />
                    Hiện tên trên trang Cơ cấu tổ chức (nếu là Trưởng/Phó Ban)
                  </label>
                </div>
                <div className="flip-back-form">
                  <NewPasswordForm requireCurrent onDone={() => { setMsg("Đã đổi mật khẩu."); setIsFlipped(false); }} />
                </div>
              </div>
            </div>
            <div className="tml-pass-foot shrink-0 px-3 py-1 text-center text-[7px] leading-tight tracking-[0.06em]">
              Bảo mật TML · Hỗ trợ kỹ thuật: Ban Công nghệ &amp; Hệ thống · community@themandarinleague.bond
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* ===== Floating dock ===== */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-1 rounded-full border border-white/15 bg-white/5 p-1.5 backdrop-blur">
        <button type="button" onClick={downloadCard} className={dockItem} title="Tải thẻ ảnh"><Download className="h-4 w-4" />Tải thẻ</button>
        {canAdmin && <Link to="/admin" className={dockItem}><ShieldCheck className="h-4 w-4" />Bàn Quản trị</Link>}
        <button type="button" onClick={signOut} className={dockItem}><LogOut className="h-4 w-4" />Đăng xuất</button>
      </div>

      {/* ===== Sheets ===== */}
      {sheet === "name" && (
        <SheetDialog title="Họ và tên trên thẻ" onClose={() => setSheet(null)}>
          <label className="block text-xs font-medium text-muted-foreground">Họ và tên
            <input className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          </label>
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Mã thành viên, Ban, Chức vụ và Điểm do TML quản lý.</p>
          <div className="mt-4 flex gap-2">
            <button onClick={saveName} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Lưu họ tên</button>
            <button onClick={() => setSheet(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Hủy</button>
          </div>
        </SheetDialog>
      )}

      {sheet === "qr" && (
        <SheetDialog title="Mã thành viên & QR" onClose={() => setSheet(null)}>
          <div className="flex flex-col items-center gap-4">
            {qr && <img src={qr} alt={`QR ${m.member_code}`} className="h-56 w-56 rounded-xl border border-border bg-white p-2" />}
            {barcode && <img src={barcode} alt={`Mã vạch ${m.member_code}`} className="h-14 max-w-[260px] bg-white px-2 py-1" />}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Mã thành viên</p>
              <p className="font-mono text-xl font-bold tracking-wider text-primary-deep">{m.member_code}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={copyCode} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Đã sao chép" : "Sao chép mã"}
              </button>
              <button onClick={() => { setSheet(null); setIsFlipped(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm"><RotateCw className="h-4 w-4" />Mặt sau</button>
            </div>
            <p className="text-center text-xs text-muted-foreground">Quét mã để mở thư viện số của TML trên thiết bị di động.</p>
          </div>
        </SheetDialog>
      )}

      {sheet === "dept_tasks" && (
        <SheetDialog title="Ban & Nhiệm vụ của tôi" onClose={() => setSheet(null)}>
          <MyDepartment canManage={canAdmin} />
          <div className="mt-6">
            <h3 className="mb-2 font-semibold">Nhiệm vụ được giao</h3>
            {taskList}
          </div>
        </SheetDialog>
      )}

      {sheet === "points_benefits" && (
        <SheetDialog title="Cấp bậc, Điểm & Quyền lợi" onClose={() => setSheet(null)}>
          <TierProgress points={m.contribution_points} />
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Lịch sử điểm</h3>
              <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${tier.className}`}>{tier.label} · {m.contribution_points}</span>
            </div>
            {pointHistory}
          </div>
          {me.data?.roles?.includes("admin") && (
            <div className="mt-5 rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-gold">Xem trước màu thẻ (chỉ Admin thấy, không đổi điểm thật)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[...[...TIERS].reverse().map((t) => [t.tone, t.label] as const), [LEADER_TONE.key, LEADER_TONE.label] as const].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setPreviewTone(k)} style={{ background: `var(--pass-${k})` }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground ring-2 ${previewTone === k ? "ring-gold" : "ring-transparent"}`}>{l}</button>
                ))}
                <button type="button" onClick={() => setPreviewTone(null)} className="rounded-full border border-border px-3 py-1 text-xs">Mặc định</button>
                <button type="button" onClick={() => setCongrats(tier.label)} className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-primary-deep">Thử hiệu ứng lên bậc</button>
              </div>
            </div>
          )}
          <div className="mt-6">
            <h3 className="mb-2 font-semibold">Quyền lợi thành viên</h3>
            <MyBenefits />
          </div>
        </SheetDialog>
      )}

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
