import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type React from "react";
import {
  Check,
  Copy,
  Download,
  LayoutGrid,
  LogOut,
  Nfc,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";
import { deptName } from "@/lib/recruitment";
import {
  LEADER_TIER,
  LEADER_TONE,
  POINT_KIND,
  TIERS,
  getMemberCardTone,
  tierOf,
} from "@/lib/points";
import { TierBadge, TierProgress } from "@/components/TierBadge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AvatarCropDialog } from "@/components/portal/AvatarCropDialog";
import { AvatarLightbox } from "@/components/portal/AvatarLightbox";
import { mainHomeUrl } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/member/dashboard")({
  staticData: { sitemap: false },
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

type Member = {
  id: string;
  member_code: string;
  full_name: string;
  department: string;
  position: string;
  joined_on: string;
  contribution_points: number;
  avatar_path: string | null;
  status: string;
  is_leader: boolean;
};
type Me = {
  email: string;
  roles?: string[];
  account: { account_status: string; must_change_password: boolean } | null;
  member: Member | null;
};
type PointTx = {
  id: string;
  reason: string;
  kind: string;
  delta: number;
  balance_after: number;
  created_at: string;
};

const nextFrame = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

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
      <rect
        x="0.5"
        y="0.5"
        width="35"
        height="27"
        rx="4"
        fill="url(#tml-emv-chip)"
        stroke="#92400e"
        strokeOpacity=".5"
      />
      <g fill="none" stroke="#7c4a03" strokeOpacity=".55" strokeWidth="1">
        <path d="M0 9h10M0 19h10M26 9h10M26 19h10M10 1v26M26 1v26" />
        <rect x="10" y="6" width="16" height="16" rx="2.5" />
      </g>
    </svg>
  );
}

function MemberDashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery({
    queryKey: ["my-account"],
    queryFn: async () => (await supabase.rpc("my_account")).data as unknown as Me,
  });
  const avatar = useQuery({
    queryKey: ["my-avatar", me.data?.member?.avatar_path],
    enabled: !!me.data?.member?.avatar_path,
    queryFn: async () =>
      (await supabase.storage.from("avatars").createSignedUrl(me.data!.member!.avatar_path!, 3600))
        .data?.signedUrl ?? null,
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [flatten, setFlatten] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tierOpen, setTierOpen] = useState(false);
  const [previewTone, setPreviewTone] = useState<string | null>(null);
  const [zoomAvatar, setZoomAvatar] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [qr, setQr] = useState("");
  const [barcode, setBarcode] = useState("");

  useEffect(() => {
    const c = me.data?.member?.member_code;
    if (!c) return;
    const cv = document.createElement("canvas");
    JsBarcode(cv, c, {
      format: "CODE128",
      displayValue: false,
      margin: 0,
      height: 40,
      width: 1.4,
    });
    setBarcode(cv.toDataURL("image/png"));
  }, [me.data?.member?.member_code]);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const cardRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  /** Drop the hover tilt so the flipped face is rasterised at a clean 180°. */
  const flipTo = (next: boolean) => {
    const el = flipRef.current;
    if (el) ["--rx", "--ry", "--lift"].forEach((p) => el.style.removeProperty(p));
    setIsFlipped(next);
  };

  const memberId = me.data?.member?.id;
  const advisor = useQuery({
    queryKey: ["my-advisor", memberId],
    enabled: !!memberId,
    queryFn: async () => (await supabase.rpc("my_advisor_roles")).data ?? [],
  });
  const pass = useQuery({
    queryKey: ["my-pass", memberId],
    enabled: !!memberId,
    queryFn: async () => ((await supabase.rpc("my_pass")).data ?? [])[0] ?? null,
  });
  /** Only fetched when the tier popup opens, so the card stays lightweight. */
  const history = useQuery({
    queryKey: ["my-points", memberId],
    enabled: !!memberId && tierOpen,
    queryFn: async () =>
      ((
        await supabase
          .from("point_transactions")
          .select("*")
          .eq("member_id", memberId!)
          .order("created_at", { ascending: false })
      ).data ?? []) as PointTx[],
  });

  useEffect(() => {
    const t = pass.data?.pass_token;
    if (!t) {
      setQr("");
      return;
    }
    QRCode.toDataURL(`https://member.themandarinleague.bond/library-access?pass=${t}`, {
      margin: 0,
      width: 200,
      errorCorrectionLevel: "M",
    }).then(setQr);
  }, [pass.data?.pass_token]);

  const [savedImg, setSavedImg] = useState<string | null>(null);
  const [layout, setLayout] = useState<"h" | "v">("h");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (me.data?.account?.must_change_password) navigate({ to: "/change-password", replace: true });
  }, [me.data, navigate]);

  const [congrats, setCongrats] = useState<string | null>(null);
  useEffect(() => {
    const mm = me.data?.member;
    if (!mm) return;
    const leader = !!mm.is_leader;
    const t = leader ? LEADER_TIER : tierOf(mm.contribution_points);
    const idx = leader ? TIERS.length + 1 : TIERS.length - TIERS.indexOf(t);
    const key = `tml_tier_seen_${mm.member_code}`;
    const prev = Number(localStorage.getItem(key) ?? 0);
    if (prev && idx > prev) setCongrats(t.label);
    if (idx !== prev) localStorage.setItem(key, String(Math.max(idx, prev ? idx : idx)));
  }, [me.data?.member]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };
  /** Sign out then land on the main TML website (full navigation when leaving the member portal). */
  const signOutToLanding = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    const home = mainHomeUrl(window.location.host);
    if (home) window.location.assign(home);
    else navigate({ to: "/", replace: true });
  };

  if (me.isLoading)
    return (
      <div className="portal-ai min-h-screen p-16 text-center portal-ink-muted">Đang tải…</div>
    );
  const m = me.data?.member;
  if (!m || me.data?.account?.account_status !== "active")
    return (
      <div className="portal-ai min-h-screen px-4 py-20 text-center">
        <div className="portal-glass mx-auto max-w-md rounded-2xl p-8">
          <h1 className="text-xl font-bold">Tài khoản không có hồ sơ thành viên hợp lệ</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vui lòng liên hệ Ban Công nghệ &amp; Hệ thống.
          </p>
          <button
            onClick={signOut}
            className="mt-6 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(m.member_code);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr("Không sao chép được mã thành viên.");
    }
  };

  /** Lightbox "Đổi ảnh": validate, then open the shared 3:4 cropper. */
  const pickAvatar = (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return void toast.error("Chỉ chấp nhận ảnh PNG, JPG hoặc WebP.");
    }
    if (file.size > 5 * 1024 * 1024) {
      return void toast.error("Kích thước ảnh tối đa là 5 MB.");
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(String(reader.result));
    reader.readAsDataURL(file);
  };

  const saveAvatar = async (blob: Blob) => {
    setSavingAvatar(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Chưa đăng nhập");
      const path = `${u.user.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, {
        upsert: true,
        contentType: "image/jpeg",
      });
      if (error) throw error;
      const { error: e2 } = await supabase.rpc("update_my_profile", {
        _full_name: m.full_name,
        _avatar_path: path,
      });
      if (e2) throw e2;
      toast.success("Đã cập nhật ảnh đại diện");
      setCropSrc(null);
      setZoomAvatar(false);
      qc.invalidateQueries({ queryKey: ["my-account"] });
      qc.invalidateQueries({ queryKey: ["my-avatar"] });
    } catch (e) {
      toast.error("Không lưu được ảnh: " + (e instanceof Error ? e.message : "Lỗi không xác định"));
    } finally {
      setSavingAvatar(false);
    }
  };

  /** Points shown are always the real stored value; leaders get the tier, not a floor. */
  const effectivePoints = m.contribution_points ?? 0;
  const realTier = tierOf(effectivePoints);
  const isLeaderCard = !!m.is_leader;
  // Leaders keep obsidian; every other position follows the real contribution tier.
  const defaultTone = getMemberCardTone(isLeaderCard, realTier.tone);
  const tone = previewTone ?? defaultTone;
  const previewTier =
    previewTone === "black"
      ? LEADER_TIER
      : previewTone
        ? TIERS.find((t) => t.tone === previewTone)
        : undefined;
  // The obsidian card always shows the leader tier label, never the raw points tier.
  const tier = tone === "black" ? LEADER_TIER : (previewTier ?? realTier);
  const advNames = (advisor.data ?? []).map(
    (a) =>
      deptName(a.dept)
        .replace(/^Ban\s+/, "")
        .split(/\s*&\s*/)[0],
  );
  const mainAdvisor = m.position === "Cố vấn chuyên môn";
  const deptLabel =
    mainAdvisor && advNames.length
      ? advNames.length === 1
        ? deptName((advisor.data ?? [])[0]?.dept ?? "")
        : advNames.join(" · ")
      : deptName(m.department);
  const posLabel = mainAdvisor ? (
    <span className="text-gold">Cố vấn chuyên môn</span>
  ) : advNames.length ? (
    <>
      {m.position} · <span className="text-gold">Cố vấn {advNames.join(" · ")}</span>
    </>
  ) : (
    m.position
  );
  const joined = new Date(m.joined_on).toLocaleDateString("vi-VN");
  const tierEl = (
    <button
      type="button"
      onClick={() => setTierOpen(true)}
      title="Xem cấp bậc, điểm & quyền lợi"
      aria-label={`Xem cấp bậc ${tier.label}, điểm và quyền lợi`}
      className="group/tier inline-flex items-center gap-1 md:gap-1.5"
    >
      <span
        key={tier.key}
        className="tml-pass-pop inline-flex transition group-hover/tier:scale-110 group-active/tier:scale-95 [&_svg]:h-[17px] [&_svg]:w-[17px] md:[&_svg]:h-8 md:[&_svg]:w-8"
      >
        <TierBadge tierKey={tone === "black" ? "leader" : tier.key} size={22} />
      </span>
      <span
        className={`inline-block rounded-full border px-1.5 py-0 text-[8px] font-semibold md:px-1.5 md:py-0.5 md:text-[13px] ${tier.className}`}
      >
        {tier.label}
      </span>
    </button>
  );
  const avatarEl = (size: string) => (
    <button
      type="button"
      onClick={() => setZoomAvatar(true)}
      title={avatar.data ? "Nhấp để xem hoặc đổi ảnh đại diện" : "Thêm ảnh đại diện"}
      aria-label={avatar.data ? "Xem hoặc đổi ảnh đại diện" : "Thêm ảnh đại diện"}
      className={`relative block ${size} shrink-0 cursor-zoom-in overflow-hidden rounded-lg border-2 border-background bg-secondary shadow-md ring-1 ring-gold/60 transition hover:brightness-105`}
    >
      {avatar.data ? (
        <img src={avatar.data} alt={m.full_name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center text-3xl font-bold text-primary">
          {m.full_name.charAt(0)}
        </span>
      )}
    </button>
  );
  /**
   * Đông Sơn drum watermark: a transparent gold vector, blended into the porcelain.
   * Both the horizontal and the vertical pass keep it centred on the card so the
   * ornament reads as an embossed seal instead of a corner sticker.
   */
  const drumWatermark = (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden"
    >
      <img
        src="/dongson-vector.svg"
        alt=""
        className={`tml-drum shrink-0 select-none object-contain ${
          layout === "v"
            ? "w-[76%] aspect-square"
            : "h-40 w-40 md:h-[18rem] md:w-[18rem] md:translate-y-4"
        }`}
      />
    </div>
  );
  /** Back face: same drum, noticeably larger so it still reads behind the security blocks. */
  const drumWatermarkBack = (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden"
    >
      <img
        src="/dongson-vector.svg"
        alt=""
        className={`tml-drum shrink-0 select-none object-contain ${layout === "v" ? "w-[84%] aspect-square" : "h-48 w-48 md:h-[18rem] md:w-[18rem]"}`}
      />
    </div>
  );
  const downloadCard = async () => {
    if (!cardRef.current) return;
    const restoreFront = isFlipped;
    setErr("");
    if (restoreFront) {
      setFlatten(true);
      flipTo(false);
      await nextFrame();
    }
    const el = cardRef.current;
    el.classList.add("is-exporting");
    const fileName = `${m.member_code}-member-pass.png`;
    try {
      // Inline the signed avatar as a data URL so export never hits CORS/cache-bust issues on mobile.
      const imgs = Array.from(el.querySelectorAll("img"));
      const originals = new Map<HTMLImageElement, string>();
      await Promise.all(
        imgs.map(async (img) => {
          if (!img.src.startsWith("http")) return;
          try {
            const b = await (await fetch(img.src, { mode: "cors" })).blob();
            const d = await new Promise<string>((r) => {
              const fr = new FileReader();
              fr.onload = () => r(fr.result as string);
              fr.readAsDataURL(b);
            });
            originals.set(img, img.src);
            img.src = d;
            await img.decode().catch(() => {});
          } catch {
            /* keep original */
          }
        }),
      );
      const ratio = Math.min(2.5, Math.max(2, window.devicePixelRatio || 2));
      let url = "";
      try {
        url = await toPng(el, { pixelRatio: ratio });
        url = await toPng(el, { pixelRatio: ratio });
      } finally {
        // second pass fixes blank images on Safari
        originals.forEach((src, img) => {
          img.src = src;
        });
      }
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Thẻ thành viên TML" });
          return;
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
        }
      }
      if (isMobile) {
        setSavedImg(url);
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      setErr("Không tải được thẻ, vui lòng thử lại.");
    } finally {
      el.classList.remove("is-exporting");
      if (restoreFront) {
        setFlatten(false);
        flipTo(true);
      }
    }
  };

  const dockItem =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white";
  const labelCls = "text-[7px] uppercase tracking-wider opacity-60 md:text-[11px]";

  return (
    <div className="portal-ai min-h-screen overflow-x-clip">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-center gap-2 text-center text-xl font-bold portal-ink sm:text-2xl">
          <img
            src="/logo.svg"
            alt="TML"
            className="h-9 w-9 rounded-full border border-gold bg-white object-cover"
          />
          Cổng thành viên
        </div>

        {err && (
          <p className="mx-auto mt-4 max-w-xl rounded-lg bg-destructive/20 px-3 py-2 text-center text-sm text-destructive">
            {err}
          </p>
        )}

        {congrats && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
            onClick={() => setCongrats(null)}
          >
            <div
              className="tml-pass-pop portal-glass max-w-sm rounded-2xl p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto w-fit">
                <TierBadge tierKey={tone === "black" ? "leader" : tier.key} size={88} />
              </div>
              <p className="mt-4 text-lg font-bold text-primary-deep">
                Chúc mừng bạn đã đạt cấp bậc thành viên mới tại The Mandarin League!
              </p>
              <p className="mt-1 text-sm font-semibold text-gold">{congrats}</p>
              <button
                onClick={() => setCongrats(null)}
                className="mt-5 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
              >
                Tuyệt vời
              </button>
            </div>
          </div>
        )}

        {/* ===== Card layout toggle ===== */}
        <div className="mt-6 flex justify-center">
          <div className="inline-flex rounded-full border border-gold/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setLayout("h");
                flipTo(false);
              }}
              className={`rounded-full px-4 py-1 font-semibold transition ${layout === "h" ? "bg-gold text-primary-deep shadow-xs" : "portal-ink-muted hover:text-foreground"}`}
            >
              Thẻ ngang
            </button>
            <button
              type="button"
              onClick={() => {
                setLayout("v");
                flipTo(false);
              }}
              className={`rounded-full px-4 py-1 font-semibold transition ${layout === "v" ? "bg-gold text-primary-deep shadow-xs" : "portal-ink-muted hover:text-foreground"}`}
            >
              Thẻ đứng
            </button>
          </div>
        </div>

        {/* ===== The pass: ID-1 flip card ===== */}
        <div className="flip-scene mt-4 flex w-full min-w-0 justify-center">
          <div
            className={
              layout === "v"
                ? "w-full min-w-0 max-w-[min(24rem,calc(100vw-2rem))] md:max-w-[36rem]"
                : "w-full min-w-0 max-w-[min(26rem,calc(100vw-2rem))] md:max-w-[40rem]"
            }
          >
            <div
              ref={flipRef}
              className={`flip-inner w-full min-w-0 max-w-full ${isFlipped ? "is-flipped" : ""} ${flatten ? "is-flat" : ""}`}
            >
              {/* ---------- FRONT ---------- */}
              <div
                ref={cardRef}
                data-tone={tone}
                style={
                  { "--pass-c": `var(--pass-${tone}, var(--pass-blue))` } as React.CSSProperties
                }
                className={`flip-face tml-pass relative flex flex-col overflow-hidden rounded-[18px] text-primary-deep ${layout === "v" ? "aspect-[54/85.6]" : "aspect-[85.6/54] md:aspect-auto"}`}
              >
                <div aria-hidden className="tml-microprint pointer-events-none absolute inset-0" />
                <div
                  aria-hidden
                  className="tml-pass-pattern pointer-events-none absolute inset-0"
                />
                <div
                  aria-hidden
                  className="tml-pass-glow pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-gold/40"
                />
                {drumWatermark}
                {layout === "h" && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute bottom-8 left-0 z-0 select-none md:bottom-14 md:left-1"
                  >
                    <img
                      src="/lac-bird-gold.png"
                      alt=""
                      draggable={false}
                      className="tml-emblem h-auto w-24 select-none object-contain md:w-44"
                    />
                  </div>
                )}
                {layout === "h" ? (
                  <>
                    {/* header */}
                    <div className="relative flex shrink-0 items-center gap-2 px-3 pt-2 md:gap-3 md:px-6 md:pt-4">
                      <img
                        src="/logo.svg"
                        alt="TML"
                        className="h-8 w-8 shrink-0 rounded-full border-2 border-gold bg-white object-cover p-0.5 shadow-sm md:h-14 md:w-14"
                      />
                      <div className="min-w-0 leading-tight">
                        <p className="font-serif text-[11px] font-bold tracking-wide text-primary md:text-[20px]">
                          普通话联盟
                        </p>
                        <p className="text-[8px] font-semibold tracking-wide md:text-[14px]">
                          The Mandarin League
                        </p>
                        <p className="text-[7px] uppercase tracking-[0.08em] opacity-70 md:text-[12px]">
                          Liên Đoàn Hán Ngữ
                        </p>
                      </div>
                      <div className="tml-banner ml-auto flex h-8 flex-1 flex-col items-end justify-center pb-1 pr-2 pt-0.5 md:h-16 md:pb-3 md:pr-5 md:pt-2">
                        <p className="text-sm font-bold leading-none tracking-[0.1em] text-primary-foreground md:text-2xl">
                          会员证
                        </p>
                        <p className="mt-1 text-[7px] font-semibold leading-none tracking-[0.1em] text-gold md:text-[12px]">
                          THẺ THÀNH VIÊN
                        </p>
                      </div>
                    </div>
                    {/* body — info left, portrait right */}
                    <div className="relative flex min-h-0 flex-1 px-3 pb-0.5 pt-0 md:px-6 md:pb-3 md:pt-2">
                      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2.5 md:gap-6">
                        <div className="flex min-w-0 flex-col">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 md:gap-x-2">
                            <SmartChip className="h-5 w-7 md:h-9 md:w-13" />
                            <Nfc className="h-3 w-3 opacity-60 md:h-5 md:w-5" />
                            <button
                              type="button"
                              onClick={() => flipTo(true)}
                              className="font-mono text-[8.5px] font-bold tracking-[0.14em] text-primary md:text-[15px]"
                              title="Xem mã bảo an (mặt sau)"
                              aria-label="Xem mã bảo an (mặt sau)"
                            >
                              {m.member_code}
                            </button>
                          </div>
                          <div className="mt-0.5 flex flex-col md:mt-3">
                            <p className="text-[7px] uppercase tracking-wider opacity-60 md:text-[12px]">
                              姓名 · Họ và tên
                            </p>
                            <div className="mt-0.5 flex items-center md:mt-1.5">
                              <span className="min-w-0 whitespace-normal break-words hyphens-none text-[13.5px] font-bold uppercase leading-[1.35] tracking-tight text-primary md:text-[26px]">
                                {m.full_name}
                              </span>
                            </div>
                          </div>
                          <dl className="mt-1 flex flex-col gap-y-0.5 text-[8.5px] leading-tight md:mt-4 md:gap-y-1.5 md:text-[15px]">
                            <div className="min-w-0">
                              <dt className={labelCls}>部门 · Ban</dt>
                              <dd className="max-w-full truncate font-semibold">{deptLabel}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className={labelCls}>职务 · Chức vụ</dt>
                              <dd className="max-w-full truncate font-semibold">{posLabel}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className={labelCls}>等级 · Hạng</dt>
                              <dd className="flex items-center gap-1 md:gap-1.5">{tierEl}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className={labelCls}>入会 · Gia nhập</dt>
                              <dd className="font-mono text-[8px] font-semibold text-foreground md:text-[14px]">
                                {joined}
                              </dd>
                            </div>
                          </dl>
                        </div>
                        <div className="flex h-full flex-col items-center justify-start gap-3 pb-0.5 pt-0.5 md:gap-4 md:pb-0 md:pt-0">
                          {avatarEl("h-[88px] w-[66px] md:h-[160px] md:w-[120px]")}
                          {qr && (
                            <button
                              type="button"
                              onClick={() => flipTo(true)}
                              aria-label="Phóng to mã QR ở mặt sau"
                              title="Phóng to mã QR ở mặt sau"
                            >
                              <img
                                src={qr}
                                alt={`QR ${m.member_code}`}
                                className="h-10 w-10 rounded-[4px] border border-gold/60 bg-white p-1 md:h-20 md:w-20 md:rounded-lg md:p-2"
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="tml-pass-foot relative flex shrink-0 items-center justify-between gap-2 px-3 py-1 text-[6.5px] tracking-[0.08em] md:px-6 md:py-2 md:text-[12px]">
                      <span className="truncate">THE MANDARIN LEAGUE · VERIFIED MEMBER PASS</span>
                      <button
                        type="button"
                        onClick={() => flipTo(true)}
                        aria-label="Xem mặt sau thẻ"
                        title="Xem mặt sau thẻ"
                        className="inline-flex shrink-0 items-center justify-center rounded-full border border-gold/60 bg-white/80 p-1 text-primary-deep shadow-sm transition hover:scale-105 hover:bg-white md:p-1.5"
                      >
                        <RotateCw className="h-3 w-3 md:h-5 md:w-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* ---------- VERTICAL LAYOUT (ID-1 COMPACT RATIO) ---------- */}
                    <div
                      aria-hidden
                      className="tml-pass-vframe pointer-events-none absolute inset-2 z-10 rounded-[13px] border border-gold/45"
                    />

                    {/* 1. Royal header */}
                    <div className="tml-vhead relative z-20 flex shrink-0 items-center justify-between gap-2 px-4 py-3 md:px-6 md:py-4">
                      <div className="min-w-0 leading-tight">
                        <p className="font-serif text-[13px] font-bold tracking-wide text-gold md:text-[18px]">
                          普通话联盟
                        </p>
                        <p className="text-[8.5px] font-bold tracking-wider text-primary-foreground md:text-[12px]">
                          THE MANDARIN LEAGUE
                        </p>
                        <p className="text-[7px] tracking-[0.1em] text-gold md:text-[10px]">
                          会员证 · THẺ THÀNH VIÊN
                        </p>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-white p-0.5 shadow-sm md:h-14 md:w-14">
                        <img
                          src="/logo.svg"
                          alt="TML"
                          className="h-full w-full rounded-full object-cover"
                        />
                      </div>
                    </div>

                    {/* 2. Compact body */}
                    <div className="relative z-20 flex min-h-0 flex-1 flex-col items-center px-3.5 pb-1 pt-1 text-center md:px-6 md:pb-2 md:pt-2">
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                      >
                        <div className="absolute h-[54%] aspect-square rounded-full border border-dashed border-gold/25" />
                        <div className="absolute h-[76%] aspect-square rounded-full border border-dashed border-gold/15" />
                      </div>

                      {/* 2.1 Portrait */}
                      <div className="relative flex w-full shrink-0 justify-center">
                        {avatarEl("w-[40%] max-w-[132px] aspect-[3/4] md:max-w-[190px]")}
                      </div>

                      {/* 2.2 Name + title */}
                      <div className="mt-2 w-full shrink-0 md:mt-4">
                        <div className="flex w-full items-center justify-center px-4">
                          <span className="block truncate text-center text-[19px] font-bold uppercase leading-[1.3] tracking-tight text-primary md:text-[27px]">
                            {m.full_name}
                          </span>
                        </div>
                        <p className="text-[8px] font-semibold uppercase tracking-wider md:text-[11px]">
                          <span className="opacity-60">OFFICIAL MEMBER PASS · </span>
                          <span
                            className={
                              tier.key === "leader" || tier.key === "honor"
                                ? "font-bold text-gold"
                                : "opacity-60"
                            }
                          >
                            {tier.label}
                          </span>
                        </p>
                      </div>

                      {/* 2.3 Smart chip module */}
                      <div className="mt-2 flex w-full shrink-0 items-center justify-between rounded-lg border border-gold/40 bg-white/80 px-2.5 py-2 text-[9px] shadow-2xs backdrop-blur-xs md:mt-4 md:px-4 md:py-3 md:text-[12px]">
                        <div className="flex items-center gap-2 md:gap-3">
                          <SmartChip className="h-6 w-8 md:h-9 md:w-11" />
                          <Nfc className="h-4 w-4 opacity-60 md:h-5 md:w-5" />
                        </div>
                        <div className="text-right leading-tight">
                          <button
                            type="button"
                            onClick={() => flipTo(true)}
                            className="block font-mono font-bold tracking-[0.14em] text-primary"
                            title="Xem mã bảo an (mặt sau)"
                            aria-label="Xem mã bảo an (mặt sau)"
                          >
                            {m.member_code}
                          </button>
                          <span className="font-mono text-[7.5px] uppercase text-muted-foreground md:text-[10px]">
                            VALID: ID-1 PASS
                          </span>
                        </div>
                      </div>

                      {/* 2.4 2x2 info grid */}
                      <div className="mt-2 grid w-full min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 text-left text-[11px] leading-tight md:mt-4 md:gap-3 md:text-[14px]">
                        <div className="flex min-w-0 flex-col justify-center gap-1 rounded-lg border border-gold/40 bg-white/80 px-2 py-1.5 shadow-2xs backdrop-blur-xs md:px-3 md:py-2.5">
                          <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[11px]">
                            部门 · BAN
                          </span>
                          <span className="block max-w-full truncate font-bold text-foreground">
                            {deptLabel}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-col justify-center gap-1 rounded-lg border border-gold/40 bg-white/80 px-2 py-1.5 shadow-2xs backdrop-blur-xs md:px-3 md:py-2.5">
                          <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[11px]">
                            职务 · CHỨC VỤ
                          </span>
                          <span className="block max-w-full truncate font-bold text-foreground">
                            {posLabel}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-col justify-center gap-1 rounded-lg border border-gold/40 bg-white/80 px-2 py-1.5 shadow-2xs backdrop-blur-xs md:px-3 md:py-2.5">
                          <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[11px]">
                            等级 · CẤP BẬC
                          </span>
                          <span className="flex items-center gap-1 truncate font-bold text-primary md:gap-1.5">
                            {tierEl}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-col justify-center gap-1 rounded-lg border border-gold/40 bg-white/80 px-2 py-1.5 shadow-2xs backdrop-blur-xs md:px-3 md:py-2.5">
                          <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[11px]">
                            入会 · GIA NHẬP
                          </span>
                          <span className="block font-mono font-bold text-foreground">
                            {joined}
                          </span>
                        </div>
                      </div>

                      {/* 2.5 QR + auth token */}
                      <div className="mt-2 flex w-full shrink-0 items-center justify-between gap-2 rounded-lg border border-gold/40 bg-white/80 px-2.5 py-2 shadow-2xs backdrop-blur-xs md:mt-4 md:px-4 md:py-3">
                        {qr ? (
                          <button
                            type="button"
                            onClick={() => flipTo(true)}
                            aria-label="Phóng to mã QR ở mặt sau"
                            title="Phóng to mã QR ở mặt sau"
                            className="shrink-0"
                          >
                            <img
                              src={qr}
                              alt={`QR ${m.member_code}`}
                              className="h-11 w-11 rounded-[3px] border border-gold/60 bg-white p-0.5 shadow-2xs md:h-16 md:w-16"
                            />
                          </button>
                        ) : (
                          <div className="h-11 w-11 shrink-0 md:h-16 md:w-16" />
                        )}
                        <div className="min-w-0 flex-1 text-right font-mono text-[8px] leading-tight text-muted-foreground md:text-[11px]">
                          <p className="uppercase tracking-wider">AUTH TOKEN</p>
                          <p className="truncate font-bold tracking-wider text-primary">
                            {pass.data?.pass_token
                              ? `SEC-TML-${pass.data.pass_token.slice(0, 6)}`
                              : m.member_code}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3. Footer + flip */}
                    <div className="tml-pass-foot relative z-20 flex shrink-0 items-center justify-between gap-2 px-3.5 py-1.5 text-[7px] tracking-[0.08em] md:px-6 md:py-2 md:text-[11px]">
                      <span className="truncate">THE MANDARIN LEAGUE · VERIFIED</span>
                      <button
                        type="button"
                        onClick={() => flipTo(true)}
                        aria-label="Xem mặt sau thẻ"
                        title="Xem mặt sau thẻ"
                        className="inline-flex shrink-0 items-center justify-center rounded-full border border-gold/60 bg-white/80 p-1 text-primary-deep shadow-sm transition hover:scale-105 hover:bg-white md:p-1.5"
                      >
                        <RotateCw className="h-3.5 w-3.5 md:h-5 md:w-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* ---------- BACK (luxury security face) ---------- */}
              <div
                data-tone={tone}
                style={
                  { "--pass-c": `var(--pass-${tone}, var(--pass-blue))` } as React.CSSProperties
                }
                aria-hidden={!isFlipped}
                className="flip-face back tml-pass tml-pass-back flex flex-col overflow-hidden rounded-[18px] text-primary-deep"
              >
                <div
                  aria-hidden
                  className="tml-pass-glow pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-gold/40"
                />
                {drumWatermarkBack}
                <div className="h-8 w-full shrink-0 border-y border-gold/30 bg-neutral-900 shadow-inner md:h-14" />
                <div className="relative flex shrink-0 items-center justify-between gap-2 px-3 pt-1.5 md:px-6 md:pt-3">
                  <button
                    type="button"
                    onClick={() => flipTo(false)}
                    aria-label="Quay lại mặt trước"
                    title="Quay lại mặt trước"
                    className="relative z-10 rounded-full border border-gold/50 bg-white/80 p-1 text-primary-deep transition hover:bg-white md:p-1.5"
                  >
                    <RotateCcw className="h-3 w-3 md:h-5 md:w-5" />
                  </button>
                  <div className="pointer-events-none absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="truncate text-[9px] font-bold uppercase tracking-[0.08em] md:text-sm">
                      Mã bảo an thành viên
                    </p>
                    <p className="truncate font-mono text-[8px] opacity-70 md:text-[11px]">
                      {m.member_code} · {tier.label}
                    </p>
                  </div>
                  <span
                    aria-label="Tem bảo an TML"
                    title="Tem bảo an TML"
                    className="relative z-10 inline-block h-6 w-6 shrink-0 rounded-full md:h-10 md:w-10"
                    style={{
                      background:
                        "conic-gradient(from 0deg,#dbeafe,#fde68a,#bbf7d0,#fbcfe8,#dbeafe)",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,.18)",
                    }}
                  />
                </div>
                <div
                  className={`relative flex min-h-0 flex-1 items-center gap-3 px-3 py-2 md:gap-6 md:px-6 md:py-4 ${
                    layout === "v" ? "flex-col justify-center" : "flex-row"
                  }`}
                >
                  {qr ? (
                    <img
                      src={qr}
                      alt={`QR ${m.member_code}`}
                      className={`aspect-square shrink-0 rounded-lg border border-gold/60 bg-white p-1.5 md:p-2.5 ${
                        layout === "v" ? "w-[62%]" : "h-full max-h-[150px] md:max-h-[220px]"
                      }`}
                    />
                  ) : (
                    <div className="grid aspect-square w-24 place-items-center rounded-lg border border-dashed border-gold/50 text-[9px] opacity-70 md:w-40 md:text-xs">
                      Chưa có mã QR
                    </div>
                  )}
                  <div
                    className={`flex min-w-0 flex-col gap-1.5 md:gap-3 ${layout === "v" ? "items-center text-center" : "flex-1"}`}
                  >
                    <div>
                      <p className="text-[7px] uppercase tracking-wider opacity-60 md:text-[11px]">
                        Mã thành viên
                      </p>
                      <p className="font-mono text-[11px] font-bold tracking-[0.14em] text-primary md:text-xl">
                        {m.member_code}
                      </p>
                    </div>
                    {barcode && (
                      <img
                        src={barcode}
                        alt={`Mã vạch ${m.member_code}`}
                        className="h-6 w-full max-w-[220px] bg-white px-1 py-0.5 md:h-12"
                      />
                    )}
                    <button
                      type="button"
                      onClick={copyCode}
                      className="inline-flex w-fit items-center gap-1 rounded-full border border-gold/60 bg-white/80 px-2 py-0.5 text-[8px] font-semibold text-primary-deep transition hover:bg-white md:gap-1.5 md:px-3 md:py-1 md:text-xs"
                    >
                      {copied ? (
                        <Check className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
                      ) : (
                        <Copy className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
                      )}
                      {copied ? "Đã sao chép" : "Sao chép mã"}
                    </button>
                    <p className="text-[7px] leading-snug opacity-70 md:text-[11px]">
                      Quét QR để mở thư viện số TML trên điện thoại.
                    </p>
                  </div>
                </div>
                <div className="tml-pass-foot shrink-0 px-3 py-1 text-center text-[7px] leading-tight tracking-[0.06em] md:px-6 md:py-2 md:text-[11px]">
                  Bảo mật TML · Hỗ trợ kỹ thuật: Ban Công nghệ &amp; Hệ thống ·
                  community@themandarinleague.bond
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Floating dock ===== */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-1 rounded-full border border-white/15 bg-white/5 p-1.5 backdrop-blur">
          <button type="button" onClick={downloadCard} className={dockItem} title="Tải thẻ ảnh">
            <Download className="h-4 w-4" />
            Tải thẻ
          </button>
          <Link to="/admin" className={dockItem}>
            <LayoutGrid className="h-4 w-4" />
            Hệ thống
          </Link>
          <button type="button" onClick={signOutToLanding} className={dockItem}>
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>

        <p className="mt-3 text-center text-xs portal-ink-muted">
          Đổi ảnh, họ tên hoặc mật khẩu tại{" "}
          <Link
            to="/admin/settings"
            className="font-semibold text-gold underline-offset-2 hover:underline"
          >
            Hệ thống › Cài đặt
          </Link>
          .
        </p>

        {/* ===== Tier & points popup (opened from the rank badge or label) ===== */}
        {tierOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cấp bậc, điểm và quyền lợi"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md"
            onClick={() => setTierOpen(false)}
          >
            <div
              className="relative my-6 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gold/30 bg-[color:var(--portal-bg,#0d1527)]/95 p-6 text-white shadow-2xl shadow-black/80 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-gold">Cấp bậc, Điểm &amp; Quyền lợi</h2>
                <button
                  type="button"
                  onClick={() => setTierOpen(false)}
                  aria-label="Đóng"
                  className="rounded-full border border-gold/20 p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4">
                <TierProgress points={effectivePoints} isLeader={isLeaderCard} />
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-white/90">Lịch sử điểm</h3>
                    <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-0.5 text-xs font-semibold text-gold">
                      {isLeaderCard ? LEADER_TIER.label : realTier.label} ·{" "}
                      <AnimatedNumber value={effectivePoints} />
                    </span>
                  </div>
                  <ol className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    {history.isLoading && (
                      <li className="p-6 text-center text-sm text-white/60">Đang tải…</li>
                    )}
                    {!history.isLoading && (history.data ?? []).length === 0 && (
                      <li className="p-6 text-center text-sm text-white/60">
                        Chưa có lịch sử điểm.
                      </li>
                    )}
                    {(history.data ?? []).map((h) => (
                      <li
                        key={h.id}
                        className="flex items-center gap-3 p-3.5 text-sm transition hover:bg-white/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{h.reason}</p>
                          <p className="text-xs text-white/60">
                            {new Date(h.created_at).toLocaleString("vi-VN")} ·{" "}
                            {POINT_KIND[h.kind] ?? h.kind} · Số dư {h.balance_after}
                          </p>
                        </div>
                        <span
                          className={`font-mono font-bold ${h.delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          {h.delta > 0 ? `+${h.delta}` : h.delta}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                {me.data?.roles?.includes("admin") && (
                  <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs font-semibold text-gold">
                      Xem trước màu thẻ (chỉ Admin thấy, không đổi điểm thật)
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        ...[...TIERS].reverse().map((t) => [t.tone, t.label] as const),
                        [LEADER_TONE.key, "Lãnh đạo (Obsidian)"] as const,
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            setPreviewTone(k);
                            setTierOpen(false);
                          }}
                          style={{ background: `var(--pass-${k})` }}
                          className={`rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground ring-2 ${previewTone === k ? "ring-gold" : "ring-transparent"}`}
                        >
                          {l}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewTone(null);
                          setTierOpen(false);
                        }}
                        className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
                      >
                        Mặc định
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCongrats(tier.label);
                          setTierOpen(false);
                        }}
                        className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-slate-950"
                      >
                        Thử hiệu ứng lên bậc
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {zoomAvatar && (
          <>
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) pickAvatar(file);
              }}
            />
            <AvatarLightbox
              src={avatar.data ?? null}
              name={m.full_name}
              initial={m.full_name.charAt(0)}
              onChange={() => avatarFileRef.current?.click()}
              onClose={() => setZoomAvatar(false)}
            />
          </>
        )}

        {cropSrc && (
          <AvatarCropDialog
            src={cropSrc}
            saving={savingAvatar}
            onCancel={() => {
              if (!savingAvatar) setCropSrc(null);
            }}
            onConfirm={saveAvatar}
          />
        )}

        {savedImg && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-foreground/80 p-4"
            onClick={() => setSavedImg(null)}
          >
            <img
              src={savedImg}
              alt="Thẻ thành viên"
              className="max-h-[75vh] max-w-full rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-center text-sm text-background">
              Nhấn giữ ảnh rồi chọn “Lưu vào Ảnh” để lưu thẻ về máy.
            </p>
            <button
              onClick={() => setSavedImg(null)}
              className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-primary-deep"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
