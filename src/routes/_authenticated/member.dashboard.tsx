import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, Check, Copy, Download, LayoutGrid, Lock, LogOut, Nfc, Pencil, RotateCcw, RotateCw, X } from "lucide-react";
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
import { LacBirds, FLOCK_H } from "@/components/portal/PassOrnaments";
import { mainHomeUrl } from "@/lib/domain";

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
  const flipRef = useRef<HTMLDivElement>(null);
  /** Drop the hover tilt so the flipped face is rasterised at a clean 180°. */
  const flipTo = (next: boolean) => {
    const el = flipRef.current;
    if (el) ["--rx", "--ry", "--lift"].forEach((p) => el.style.removeProperty(p));
    setIsFlipped(next);
  };
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
  const [tab, setTab] = useState<"card" | "tasks" | "points" | "benefits">("card");
  const [layout, setLayout] = useState<"h" | "v">("h");
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
  /** Sign out then land on the main TML website (full navigation when leaving the member portal). */
  const signOutToLanding = async () => {
    await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut();
    const home = mainHomeUrl(window.location.host);
    if (home) window.location.assign(home); else navigate({ to: "/", replace: true });
  };

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
  const tierEl = <><span key={tier.key} className="tml-pass-pop inline-flex [&_svg]:h-[22px] [&_svg]:w-[22px] md:[&_svg]:h-8 md:[&_svg]:w-8"><TierBadge tierKey={tone === "black" ? "leader" : tier.key} size={22} /></span><span className={`inline-block rounded-full border px-1.5 text-[9px] font-semibold md:text-[13px] ${tier.className}`}>{tier.label}</span></>;
  const avatarEl = (size: string) => (
    <label className={`group relative block ${size} shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-background bg-secondary shadow-md ring-1 ring-gold/60`}>
      {avatar.data ? <img src={avatar.data} alt={m.full_name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-3xl font-bold text-primary">{m.full_name.charAt(0)}</span>}
      <span className="absolute inset-0 flex items-center justify-center bg-foreground/50 text-background opacity-0 transition group-hover:opacity-100"><Camera className="h-5 w-5" /></span>
      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
    </label>
  );
  /**
   * Đông Sơn drum watermark: the member-supplied photo, blended into the porcelain.
   * The horizontal pass pins it to the bottom-left corner (behind the info list),
   * while the vertical pass keeps it centred.
   */
  const drumWatermark = (
    <div
      aria-hidden
      className={`pointer-events-none absolute select-none ${
        layout === "v"
          ? "inset-0 flex items-center justify-center"
          : "-bottom-20 -left-20 md:-bottom-40 md:-left-40"
      }`}
    >
      <img
        src="/dongson-gold.png"
        alt=""
        className={`tml-drum shrink-0 select-none rounded-full object-cover ${
          layout === "v" ? "w-[92%] aspect-square" : "h-60 w-60 md:h-[30rem] md:w-[30rem]"
        }`}
      />
    </div>
  );
  /** Back face: same drum, noticeably larger so it still reads behind the settings blocks. */
  const drumWatermarkBack = (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex select-none items-center justify-center">
      <img
        src="/dongson-gold.png"
        alt=""
        className={`tml-drum shrink-0 select-none rounded-full object-cover ${layout === "v" ? "w-[100%] aspect-square" : "h-64 w-64 md:h-[32rem] md:w-[32rem]"}`}
      />
    </div>
  );
  const downloadCard = async () => {
    if (!cardRef.current) return;
    const restoreFront = isFlipped;
    setErr("");
    if (restoreFront) { setFlatten(true); flipTo(false); await nextFrame(); }
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
      if (restoreFront) { setFlatten(false); flipTo(true); }
    }
  };
  const act = async (id: string, action: "start" | "submit", evidence = "", note = "") => {
    setErr(""); setMsg("");
    const { error } = await supabase.rpc("member_update_task", { _task: id, _action: action, _evidence: evidence, _note: note });
    if (error) setErr(error.message); else { setMsg(action === "submit" ? "Đã nộp báo cáo." : "Đã tiếp nhận nhiệm vụ."); setReporting(null); qc.invalidateQueries({ queryKey: ["my-tasks"] }); }
  };

  const dockItem = "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white";
  const labelCls = "text-[7px] uppercase tracking-wider opacity-60 md:text-[11px]";

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
    <div className="portal-ai min-h-screen overflow-x-clip"><div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-center gap-2 text-center text-xl font-bold portal-ink sm:text-2xl">
        <img src="/logo.svg" alt="TML" className="h-9 w-9 rounded-full border border-gold bg-white object-cover" />Cổng thành viên
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

      {/* ===== Tab bar ===== */}
      <div className="mt-4 flex gap-2 overflow-x-auto border-b border-primary/20 pb-0.5">
        {([
          ["card", "Thẻ & Hồ sơ"],
          ["tasks", "Ban & Nhiệm vụ"],
          ["points", "Lịch sử điểm"],
          ["benefits", "Quyền lợi"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => { setTab(k); flipTo(false); }}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              tab === k ? "border-gold text-gold" : "border-transparent portal-ink-muted hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "card" && (
        <>
          {/* ===== Card layout toggle ===== */}
          <div className="mt-4 flex justify-center">
            <div className="inline-flex rounded-full border border-gold/40 p-0.5 text-xs">
              <button type="button" onClick={() => { setLayout("h"); flipTo(false); }}
                className={`rounded-full px-4 py-1 font-semibold transition ${layout === "h" ? "bg-gold text-primary-deep shadow-xs" : "portal-ink-muted hover:text-foreground"}`}>
                Thẻ ngang
              </button>
              <button type="button" onClick={() => { setLayout("v"); flipTo(false); }}
                className={`rounded-full px-4 py-1 font-semibold transition ${layout === "v" ? "bg-gold text-primary-deep shadow-xs" : "portal-ink-muted hover:text-foreground"}`}>
                Thẻ đứng
              </button>
            </div>
          </div>

          {/* ===== The pass: ID-1 flip card ===== */}
          <div className={`flip-scene mt-4 flex w-full min-w-0 justify-center`}>
            <div className={layout === "v"
              ? "w-full min-w-0 max-w-[min(24rem,calc(100vw-2rem))] md:max-w-[36rem]"
              : "w-full min-w-0 max-w-[min(26rem,calc(100vw-2rem))] md:max-w-[52rem]"}>
        {/* The pass no longer tilts or rotates in 3D (desktop mirrors the phone
            cross-fade), so the old hover-tilt pointer handlers are gone. */}
        <div
          ref={flipRef}
          className={`flip-inner w-full min-w-0 max-w-full ${isFlipped ? "is-flipped" : ""} ${flatten ? "is-flat" : ""}`}
        >
          {/* ---------- FRONT ---------- */}
          <div ref={cardRef} data-tone={tone} style={{ "--pass-c": `var(--pass-${tone})` } as React.CSSProperties}
            className={`flip-face tml-pass relative flex flex-col overflow-hidden rounded-[18px] text-primary-deep ${layout === "v" ? "aspect-[54/85.6]" : "aspect-[85.6/54] md:aspect-auto"}`}>
            <div aria-hidden className="tml-microprint pointer-events-none absolute inset-0" />
            <div aria-hidden className="tml-pass-pattern pointer-events-none absolute inset-0" />
            <div aria-hidden className="tml-pass-glow pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-gold/40" />
            {drumWatermark}
            {layout === "h" && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
              >
                <img
                  src="/lac-bird-gold.png"
                  alt=""
                  draggable={false}
                  className="tml-emblem h-auto w-24 max-w-[45%] select-none object-contain md:w-64"
                />
              </div>
            )}
            <LacBirds flock={FLOCK_H} className="md:scale-[1.8]" />
            {layout === "h" ? <>
            {/* header */}
            <div className="relative flex shrink-0 items-center gap-2 px-3 pt-2 md:gap-3 md:px-6 md:pt-4">
              <img src="/logo.svg" alt="TML" className="h-8 w-8 shrink-0 rounded-full border-2 border-gold bg-white object-cover p-0.5 shadow-sm md:h-14 md:w-14" />
              <div className="min-w-0 leading-tight">
                <p className="font-serif text-[11px] font-bold tracking-wide text-primary md:text-[20px]">普通话联盟</p>
                <p className="text-[8px] font-semibold tracking-wide md:text-[14px]">The Mandarin League</p>
                <p className="text-[7px] uppercase tracking-[0.08em] opacity-70 md:text-[12px]">Liên Đoàn Hán Ngữ</p>
              </div>
              <div className="tml-banner ml-auto flex h-9 flex-1 flex-col items-end justify-center pb-1.5 pr-2.5 pt-1 md:h-16 md:pb-3 md:pr-5 md:pt-2">
                <p className="text-sm font-bold leading-none tracking-[0.1em] text-primary-foreground md:text-2xl">会员证</p>
                <p className="mt-1 text-[7px] font-semibold leading-none tracking-[0.1em] text-gold md:text-[12px]">THẺ THÀNH VIÊN</p>
              </div>
            </div>
            {/* body — info left, portrait right (aligned to the same 16px content box) */}
            <div className="relative flex min-h-0 flex-1 px-3 pb-1 pt-0.5 md:px-6 md:pb-3 md:pt-2">
              <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2.5 md:gap-6">
                <div className="flex min-w-0 flex-col">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 md:gap-x-2">
                    <SmartChip className="h-5 w-7 md:h-9 md:w-13" />
                    <Nfc className="h-3 w-3 opacity-60 md:h-5 md:w-5" />
                    <button type="button" onClick={() => setSheet("qr")} className="font-mono text-[8.5px] font-bold tracking-[0.14em] text-primary md:text-[15px]" title="Mã thành viên">{m.member_code}</button>
                    <span className="text-[8px] opacity-40 md:text-[14px]">•</span>
                    <button type="button" onClick={() => setSheet("points_benefits")} className="text-[8.5px] font-semibold text-primary md:text-[15px]" title="Cấp bậc, điểm & quyền lợi">{m.contribution_points.toLocaleString("vi-VN")} điểm</button>
                  </div>
                  <div className="mt-1 flex flex-col md:mt-3">
                    <p className="mt-1 text-[7px] uppercase tracking-wider opacity-60 md:text-[12px]">姓名 · Họ và tên</p>
                    <div className="flex items-center">
                      <button type="button" onClick={() => setSheet("name")} className="group/name flex w-full min-w-0 items-start gap-1 text-left" title="Sửa họ tên">
                        <span className="min-w-0 whitespace-normal break-words hyphens-none text-[14px] font-bold uppercase leading-tight tracking-tight text-primary md:text-[26px]">{m.full_name}</span>
                        <Pencil className="mt-0.5 h-3 w-3 shrink-0 opacity-0 transition group-hover/name:opacity-70 md:h-5 md:w-5" />
                      </button>
                    </div>
                  </div>
                  <dl className="mt-2 flex flex-col gap-y-0.5 pb-0.5 text-[8.5px] leading-tight md:mt-4 md:gap-y-1.5 md:text-[15px]">
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
                        <button type="button" onClick={() => setSheet("points_benefits")} title="Xem cấp bậc, điểm & quyền lợi" className="flex items-center gap-1 md:gap-1.5">{tierEl}</button>
                      </dd>
                    </div>
                    <div>
                      <dt className={labelCls}>入会 · Gia nhập</dt>
                      <dd className="font-mono text-[8px] md:text-[14px]">{joined}</dd>
                    </div>
                  </dl>
                </div>
                <div className="flex h-full flex-col items-center justify-between pb-0.5 pt-0.5 md:justify-start md:gap-4 md:pb-0 md:pt-0">
                  {avatarEl("h-[88px] w-[66px] md:h-[160px] md:w-[120px]")}
                  {qr && <button type="button" onClick={() => setSheet("qr")} aria-label="Phóng to mã QR" title="Mã QR thư viện số" className="mt-auto md:mt-0">
                    <img src={qr} alt={`QR ${m.member_code}`} className="h-10 w-10 rounded-[4px] border border-gold/60 bg-white p-1 md:h-20 md:w-20 md:rounded-lg md:p-2" />
                  </button>}
                </div>
              </div>
            </div>
            <div className="tml-pass-foot relative flex shrink-0 items-center justify-between gap-2 px-3 py-1 text-[6.5px] tracking-[0.08em] md:px-6 md:py-2 md:text-[12px]">
              <span className="truncate">THE MANDARIN LEAGUE · VERIFIED MEMBER PASS</span>
              <button type="button" onClick={() => flipTo(true)} aria-label="Xem mặt sau thẻ" title="Xem mặt sau thẻ"
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-gold/60 bg-white/80 p-1 text-primary-deep shadow-sm transition hover:scale-105 hover:bg-white md:p-1.5">
                <RotateCw className="h-3 w-3 md:h-5 md:w-5" />
              </button>
            </div>
            </> : <>
            {/* ---------- VERTICAL LAYOUT (ID-1 COMPACT RATIO) ---------- */}
            <div aria-hidden className="tml-pass-vframe pointer-events-none absolute inset-2 z-10 rounded-[13px] border border-gold/45" />

            {/* 1. Royal header */}
            <div className="tml-vhead relative z-20 flex shrink-0 items-center justify-between gap-2 px-4 py-3 md:px-6 md:py-4">
              <div className="min-w-0 leading-tight">
                <p className="font-serif text-[13px] font-bold tracking-wide text-gold md:text-[18px]">普通话联盟</p>
                <p className="text-[8.5px] font-bold tracking-wider text-primary-foreground md:text-[12px]">THE MANDARIN LEAGUE</p>
                <p className="text-[7px] tracking-[0.1em] text-gold md:text-[10px]">会员证 · THẺ THÀNH VIÊN</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-white p-0.5 shadow-sm md:h-14 md:w-14">
                <img src="/logo.svg" alt="TML" className="h-full w-full rounded-full object-cover" />
              </div>
            </div>

            {/* 2. Compact body — every block is shrink-0 so nothing is pushed out */}
            <div className="relative z-20 flex min-h-0 flex-1 flex-col items-center px-3.5 pb-1 pt-1 text-center md:px-6 md:pb-2 md:pt-2">
              {/* concentric security rings behind the content */}
              <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="absolute h-[54%] aspect-square rounded-full border border-dashed border-gold/25" />
                <div className="absolute h-[76%] aspect-square rounded-full border border-dashed border-gold/15" />
              </div>

              {/* 2.1 Portrait — scales with the card so the body never looks hollow */}
              <div className="relative flex w-full shrink-0 justify-center">
                {avatarEl("w-[40%] max-w-[132px] aspect-[3/4] md:max-w-[190px]")}
              </div>

              {/* 2.2 Name + title */}
              <div className="mt-2 w-full shrink-0 md:mt-4">
                <div className="flex w-full items-center justify-center">
                  <button type="button" onClick={() => setSheet("name")} className="group/name relative min-w-0 max-w-full px-4" title="Sửa họ tên">
                    <span className="block truncate text-center text-[19px] font-bold uppercase tracking-tight text-primary md:text-[27px]">{m.full_name}</span>
                    <Pencil className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-0 transition group-hover/name:opacity-70 md:h-5 md:w-5" />
                  </button>
                </div>
                <p className="text-[8px] font-semibold uppercase tracking-wider opacity-60 md:text-[11px]">OFFICIAL MEMBER PASS · {tier.label}</p>
              </div>

              {/* 2.3 Smart chip module */}
              <div className="mt-2 flex w-full shrink-0 items-center justify-between rounded-lg border border-gold/40 bg-white/80 px-2.5 py-2 text-[9px] shadow-2xs backdrop-blur-xs md:mt-4 md:px-4 md:py-3 md:text-[12px]">
                <div className="flex items-center gap-2 md:gap-3">
                  <SmartChip className="h-6 w-8 md:h-9 md:w-11" />
                  <Nfc className="h-4 w-4 opacity-60 md:h-5 md:w-5" />
                </div>
                <div className="text-right leading-tight">
                  <button type="button" onClick={() => setSheet("qr")} className="block font-mono font-bold tracking-[0.14em] text-primary" title="Mã thành viên">{m.member_code}</button>
                  <span className="font-mono text-[7.5px] uppercase text-muted-foreground md:text-[10px]">VALID: ID-1 PASS</span>
                </div>
              </div>

              {/* 2.4 2x2 info grid — grows to fill the body, label on top and value at the bottom */}
              <div className="mt-2 grid w-full min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 text-left text-[11px] leading-tight md:mt-4 md:gap-3 md:text-[14px]">
                <div className="flex min-w-0 flex-col justify-center gap-1 rounded-lg border border-gold/40 bg-white/80 px-2 py-1.5 shadow-2xs backdrop-blur-xs md:px-3 md:py-2.5">
                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[11px]">部门 · BAN</span>
                  <button type="button" onClick={() => setSheet("dept_tasks")} title="Xem Ban & nhiệm vụ" className="block max-w-full truncate text-left font-bold text-foreground hover:text-primary">{deptLabel}</button>
                </div>
                <div className="flex min-w-0 flex-col justify-center gap-1 rounded-lg border border-gold/40 bg-white/80 px-2 py-1.5 shadow-2xs backdrop-blur-xs md:px-3 md:py-2.5">
                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[11px]">职务 · CHỨC VỤ</span>
                  <button type="button" onClick={() => setSheet("points_benefits")} title="Xem chức vụ & quyền lợi" className="block max-w-full truncate text-left font-bold text-foreground hover:text-primary">{posLabel}</button>
                </div>
                <div className="flex min-w-0 flex-col justify-center gap-1 rounded-lg border border-gold/40 bg-white/80 px-2 py-1.5 shadow-2xs backdrop-blur-xs md:px-3 md:py-2.5">
                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[11px]">等级 · CẤP BẬC</span>
                  <button type="button" onClick={() => setSheet("points_benefits")} title="Xem cấp bậc & điểm" className="flex items-center gap-1 truncate font-bold text-primary md:gap-1.5">{tierEl}</button>
                </div>
                <div className="flex min-w-0 flex-col justify-center gap-1 rounded-lg border border-gold/40 bg-white/80 px-2 py-1.5 shadow-2xs backdrop-blur-xs md:px-3 md:py-2.5">
                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[11px]">入会 · GIA NHẬP</span>
                  <span className="block font-mono font-bold text-foreground">{joined}</span>
                </div>
              </div>

              {/* 2.5 QR + auth token */}
              <div className="mt-2 flex w-full shrink-0 items-center justify-between gap-2 rounded-lg border border-gold/40 bg-white/80 px-2.5 py-2 shadow-2xs backdrop-blur-xs md:mt-4 md:px-4 md:py-3">
                {qr ? (
                  <button type="button" onClick={() => setSheet("qr")} aria-label="Phóng to mã QR" title="Phóng to mã QR" className="shrink-0">
                    <img src={qr} alt={`QR ${m.member_code}`} className="h-11 w-11 rounded-[3px] border border-gold/60 bg-white p-0.5 shadow-2xs md:h-16 md:w-16" />
                  </button>
                ) : <div className="h-11 w-11 shrink-0 md:h-16 md:w-16" />}
                <div className="min-w-0 flex-1 text-right font-mono text-[8px] leading-tight text-muted-foreground md:text-[11px]">
                  <p className="uppercase tracking-wider">AUTH TOKEN</p>
                  <p className="truncate font-bold tracking-wider text-primary">{pass.data?.pass_token ? `SEC-TML-${pass.data.pass_token.slice(0, 6)}` : m.member_code}</p>
                </div>
              </div>
            </div>

            {/* 3. Footer + flip */}
            <div className="tml-pass-foot relative z-20 flex shrink-0 items-center justify-between gap-2 px-3.5 py-1.5 text-[7px] tracking-[0.08em] md:px-6 md:py-2 md:text-[11px]">
              <span className="truncate">THE MANDARIN LEAGUE · VERIFIED</span>
              <button type="button" onClick={() => flipTo(true)} aria-label="Xem mặt sau thẻ" title="Xem mặt sau thẻ"
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-gold/60 bg-white/80 p-1 text-primary-deep shadow-sm transition hover:scale-105 hover:bg-white md:p-1.5">
                <RotateCw className="h-3.5 w-3.5 md:h-5 md:w-5" />
              </button>
            </div>
            </>}
          </div>

          {/* ---------- BACK (luxury security & settings) ---------- */}
          <div data-tone={tone} style={{ "--pass-c": `var(--pass-${tone})` } as React.CSSProperties}
            aria-hidden={!isFlipped}
            className="flip-face back tml-pass tml-pass-back flex flex-col overflow-hidden rounded-[18px] text-primary-deep">
            <div aria-hidden className="tml-pass-glow pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-gold/40" />
            {drumWatermarkBack}
            <div className="h-8 w-full shrink-0 border-y border-gold/30 bg-neutral-900 shadow-inner md:h-14" />
            <div className="relative flex shrink-0 items-center justify-between gap-2 px-3 pt-1.5 md:px-6 md:pt-3">
              <button type="button" onClick={() => flipTo(false)} aria-label="Quay lại mặt trước" title="Quay lại mặt trước"
                className="relative z-10 rounded-full border border-gold/50 bg-white/80 p-1 text-primary-deep transition hover:bg-white md:p-1.5">
                <RotateCcw className="h-3 w-3 md:h-5 md:w-5" />
              </button>
              <div className="pointer-events-none absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="truncate text-[9px] font-bold uppercase tracking-[0.08em] md:text-sm">Cài đặt &amp; bảo mật tài khoản</p>
                <p className="truncate font-mono text-[8px] opacity-70 md:text-[11px]">{m.member_code} · {tier.label}</p>
              </div>
              <span aria-label="Tem bảo an TML" title="Tem bảo an TML" className="relative z-10 inline-block h-6 w-6 shrink-0 rounded-full md:h-10 md:w-10"
                style={{ background: "conic-gradient(from 0deg,#dbeafe,#fde68a,#bbf7d0,#fbcfe8,#dbeafe)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.18)" }} />
            </div>
            <div className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-1 pt-1.5 md:px-6 md:pb-3 md:pt-3">
              <div className="mx-auto flex w-full max-w-xl flex-col gap-1.5 md:gap-3">
                <div className="flip-back-form order-1">
                  <NewPasswordForm requireCurrent onDone={() => { setMsg("Đã đổi mật khẩu."); flipTo(false); }} />
                </div>
                <div className="order-2 space-y-2">
                  <label className="flex items-start gap-2 text-[9px] font-semibold leading-snug md:text-sm">
                    <input type="checkbox" className="mt-0.5 h-3 w-3 shrink-0 accent-[var(--pass-c)] md:h-4 md:w-4"
                      checked={(m as { is_public?: boolean }).is_public !== false}
                      onChange={async (e) => {
                        const { error } = await supabase.rpc("set_my_visibility", { _public: e.target.checked });
                        if (error) setErr(error.message); else { setMsg("Đã cập nhật tùy chọn hiển thị."); qc.invalidateQueries({ queryKey: ["my-account"] }); }
                      }} />
                    Hiện tên trên trang Cơ cấu tổ chức (nếu là Trưởng/Phó Ban)
                  </label>
                </div>
              </div>
            </div>
            <div className="tml-pass-foot shrink-0 px-3 py-1 text-center text-[7px] leading-tight tracking-[0.06em] md:px-6 md:py-2 md:text-[11px]">
              Bảo mật TML · Hỗ trợ kỹ thuật: Ban Công nghệ &amp; Hệ thống · community@themandarinleague.bond
            </div>
          </div>
        </div>
        </div>
      </div>

          {/* ===== Floating dock ===== */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-1 rounded-full border border-white/15 bg-white/5 p-1.5 backdrop-blur">
            <button type="button" onClick={downloadCard} className={dockItem} title="Tải thẻ ảnh"><Download className="h-4 w-4" />Tải thẻ</button>
            <Link to="/admin" className={dockItem}><LayoutGrid className="h-4 w-4" />Hệ thống</Link>
            <button type="button" onClick={signOutToLanding} className={dockItem}><LogOut className="h-4 w-4" />Đăng xuất</button>
          </div>
        </>
      )}

      {tab === "tasks" && (
        <>
          <MyDepartment canManage={canAdmin} />
          <section className="portal-glass mt-6 rounded-2xl p-5">
            <h2 className="mb-3 font-semibold">Nhiệm vụ của tôi</h2>
            {taskList}
          </section>
        </>
      )}

      {tab === "points" && (
        <section className="portal-glass mt-6 rounded-2xl p-5">
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div><p className="text-sm text-muted-foreground">Tổng điểm đóng góp</p><p className="text-3xl font-bold text-gold">{m.contribution_points}</p></div>
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${tier.className}`}>{tier.label}</span>
          </div>
          <div className="mt-4">
            <h3 className="mb-2 font-semibold">Biến động điểm</h3>
            {pointHistory}
          </div>
        </section>
      )}

      {tab === "benefits" && <MyBenefits />}

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
              <button onClick={() => { setSheet(null); flipTo(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm"><RotateCw className="h-4 w-4" />Mặt sau</button>
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
