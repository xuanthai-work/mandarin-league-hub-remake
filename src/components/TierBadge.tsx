import { useId, useState } from "react";
import { Lock, X } from "lucide-react";
import { TIERS, tierOf } from "@/lib/points";

const METAL: Record<string, string> = { bronze: "bronze", silver: "silver", gold: "gold", platinum: "purple" };
const ENAMEL: Record<string, string> = { bronze: "var(--enamel-amber)", silver: "var(--enamel-azure)", gold: "var(--sapphire)", platinum: "var(--metal-purple-lo)" };
const GLYPH: Record<string, string> = { bronze: "习", silver: "积", gold: "骨", platinum: "精" };

const star = (n: number, ro: number, ri: number, rot = -Math.PI / 2) =>
  Array.from({ length: n * 2 }).map((_, i) => { const r = i % 2 ? ri : ro; const a = rot + (i * Math.PI) / n; return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`; }).join(" ");

const SHIELD = "M50 6 L86 17 V47 C86 70 70 85 50 94 C30 85 14 70 14 47 V17 Z";

function Outer({ k, fill }: { k: string; fill: string }) {
  if (k === "bronze") return <path d={SHIELD} fill={fill} />;
  if (k === "silver") return <polygon points={star(6, 48, 38)} fill={fill} />;
  if (k === "gold") return <polygon points={star(16, 48, 40, -Math.PI / 2)} fill={fill} />;
  return <polygon points={star(8, 49, 33)} fill={fill} />;
}

function Laurel({ color }: { color: string }) {
  return <>{[0, 1].map((side) => (
    <g key={side} transform={side ? "translate(100,0) scale(-1,1)" : undefined}>
      <path d="M30 74 Q20 60 24 40" fill="none" style={{ stroke: color }} strokeWidth="1.2" />
      {[0, 1, 2, 3, 4].map((j) => { const y = 72 - j * 7.5, x = 27 - Math.sin(j / 2) * 3.5; return <ellipse key={j} cx={x - 3} cy={y} rx="1.6" ry="4" transform={`rotate(${-55 + j * 9} ${x - 3} ${y})`} style={{ fill: color }} />; })}
    </g>
  ))}</>;
}

export function TierBadge({ tierKey, size = 96, locked = false }: { tierKey: string; size?: number; locked?: boolean }) {
  const id = useId().replace(/:/g, "");
  const k = METAL[tierKey] ? tierKey : "bronze";
  const m = METAL[k]!;
  const v = (x: string) => `var(--metal-${m}${x})`;
  const trim = k === "platinum" ? "var(--metal-gold)" : v("");
  const trimHi = k === "platinum" ? "var(--metal-gold-hi)" : v("-hi");
  const trimLo = k === "platinum" ? "var(--metal-gold-lo)" : v("-lo");
  const detail = size >= 40;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={`Huy hiệu ${tierKey}`} className={locked ? "opacity-40 grayscale" : "drop-shadow-lg"}>
      <defs>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: trimHi }} /><stop offset="0.45" style={{ stopColor: trim }} /><stop offset="0.55" style={{ stopColor: trimHi }} /><stop offset="1" style={{ stopColor: trimLo }} />
        </linearGradient>
        <radialGradient id={`e${id}`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" style={{ stopColor: v("-hi") }} /><stop offset="0.35" style={{ stopColor: v("") }} /><stop offset="1" style={{ stopColor: ENAMEL[k] }} />
        </radialGradient>
        <radialGradient id={`a${id}`}>
          <stop offset="0.5" style={{ stopColor: k === "platinum" ? "var(--amethyst-glow)" : trimHi, stopOpacity: 0.8 }} /><stop offset="1" style={{ stopColor: trim, stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id={`s${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.75" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`c${id}`}><Outer k={k} fill="#000" /></clipPath>
      </defs>

      {!locked && (k === "gold" || k === "platinum") && <circle className="badge-aura" cx="50" cy="50" r="50" fill={`url(#a${id})`} />}
      {k === "platinum" && detail && Array.from({ length: 16 }).map((_, i) => (
        <line key={i} x1="50" y1="50" x2={50 + 50 * Math.cos((i * Math.PI) / 8 + Math.PI / 16)} y2={50 + 50 * Math.sin((i * Math.PI) / 8 + Math.PI / 16)} style={{ stroke: "var(--amethyst-glow)" }} strokeWidth="0.6" opacity="0.5" />
      ))}

      <Outer k={k} fill={`url(#m${id})`} />
      <g transform="translate(50 50) scale(0.9) translate(-50 -50)"><Outer k={k} fill="none" /></g>
      <g transform="translate(50 50) scale(0.88) translate(-50 -50)" style={{ stroke: trimLo }} strokeWidth="0.8" fill="none"><Outer k={k} fill="none" /></g>

      {k === "bronze" && detail && [[24, 22], [76, 22], [24, 58], [76, 58], [50, 86]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.8" style={{ fill: trimHi, stroke: trimLo }} strokeWidth="0.5" />)}
      {k === "platinum" && Array.from({ length: 8 }).map((_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 4; return <circle key={i} cx={50 + 42 * Math.cos(a)} cy={50 + 42 * Math.sin(a)} r="3" style={{ fill: "var(--metal-purple)", stroke: "var(--metal-gold-hi)" }} strokeWidth="0.8" />; })}

      {/* medallion */}
      <circle cx="50" cy="50" r="29" style={{ fill: trimLo }} />
      <circle cx="50" cy="50" r="27" fill={`url(#e${id})`} />
      {detail && <g fill="none" style={{ stroke: v("-hi") }} opacity="0.35" strokeWidth="0.4">
        {[24, 21, 18].map((r) => <circle key={r} cx="50" cy="50" r={r} strokeDasharray="1.2 1.2" />)}
        {Array.from({ length: 24 }).map((_, i) => <ellipse key={i} cx="50" cy="50" rx="25" ry="9" transform={`rotate(${i * 7.5} 50 50)`} />)}
      </g>}
      <circle cx="50" cy="50" r="27" fill="none" style={{ stroke: trimHi }} strokeWidth="0.8" />

      {(k === "gold" || k === "platinum") && detail && <Laurel color={trimHi} />}

      {k === "platinum" && <path d="M38 33 L41 25 L45 31 L50 22 L55 31 L59 25 L62 33 Z" style={{ fill: "var(--metal-gold-hi)", stroke: "var(--metal-gold-lo)" }} strokeWidth="0.6" />}
      {k === "bronze" && detail && <g style={{ stroke: trimHi }} strokeWidth="1.2" fill="none" strokeLinecap="round"><path d="M38 66 H62 M40 69 H60" /><path d="M50 64 V30 M50 40 Q43 37 42 31 Q49 33 50 40 M50 36 Q57 33 58 27 Q51 29 50 36" /></g>}
      {k === "silver" && detail && <path d="M30 66 Q36 62 42 66 T54 66 T66 66 T72 66" fill="none" style={{ stroke: trimHi }} strokeWidth="1" />}

      <text x="50" y={k === "platinum" ? 58 : k === "bronze" ? 57 : 59} textAnchor="middle" fontSize={k === "bronze" ? 17 : 22} fontWeight="800" fontFamily="'Noto Serif SC', 'Songti SC', serif"
        style={{ fill: k === "platinum" ? "var(--metal-gold-hi)" : trimHi, stroke: trimLo }} strokeWidth="0.6" paintOrder="stroke">{GLYPH[k]}</text>
      {k === "platinum" && <path d="M44 66 Q50 60 56 66 Q50 70 44 66 Z" style={{ fill: "var(--metal-gold)" }} />}

      {!locked && <g clipPath={`url(#c${id})`}><rect className="badge-sheen" x="20" y="-10" width="18" height="120" fill={`url(#s${id})`} /></g>}
      {locked && <g><circle cx="78" cy="78" r="12" style={{ fill: "var(--primary-deep)" }} /><foreignObject x="70" y="70" width="16" height="16"><Lock className="h-4 w-4 text-primary-foreground" /></foreignObject></g>}
    </svg>
  );
}

export function TierProgress({ points }: { points: number }) {
  const [open, setOpen] = useState(false);
  const cur = tierOf(points);
  const asc = [...TIERS].reverse();
  const idx = asc.findIndex((t) => t.key === cur.key);
  const next = asc[idx + 1];
  const pct = next ? Math.min(100, Math.round(((points - cur.min) / (next.min - cur.min)) * 100)) : 100;
  return (
    <div className="portal-glass mt-3 rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <TierBadge tierKey={cur.key} size={84} />
        <div className="min-w-0 flex-1">
          <p className="text-xs portal-ink-muted">Danh hiệu hiện tại</p>
          <p className="text-xl font-bold text-gold">{cur.label} <span className="font-serif text-base portal-ink-muted">{TIER_INFO[cur.key]?.zh}</span></p>
          <p className="text-xs portal-ink-muted">{TIER_INFO[cur.key]?.motto}</p>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-primary/20"><div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${pct}%` }} /></div>
      <p className="mt-2 text-xs portal-ink-muted">
        {next ? <>{points}/{next.min} điểm ({pct}%) · Còn <b className="text-gold">{next.min - points} điểm</b> để mở khóa <b className="text-gold">{next.label.toUpperCase()}</b></> : "Bạn đã đạt danh hiệu cao nhất của TML!"}
      </p>
      <button onClick={() => setOpen(true)} className="mt-3 text-sm font-semibold text-gold underline-offset-4 hover:underline">Xem bảng danh hiệu & đặc quyền →</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background p-6 text-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-primary-deep">Thang bậc cống hiến TML</h3><button onClick={() => setOpen(false)} aria-label="Đóng"><X className="h-5 w-5" /></button></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {asc.map((t, i) => {
                const info = TIER_INFO[t.key]!; const reached = points >= t.min; const isCur = t.key === cur.key;
                return (
                  <div key={t.key} className={`flex flex-col items-center rounded-xl border p-4 text-center ${isCur ? "border-gold bg-gold-soft" : "border-border"}`}>
                    <TierBadge tierKey={t.key} size={88} locked={!reached} />
                    <p className="mt-2 font-bold text-primary-deep">{t.label} <span className="font-serif text-sm text-muted-foreground">{info.zh}</span></p>
                    <p className="text-xs font-semibold text-gold">{asc[i + 1] ? `${t.min}–${asc[i + 1]!.min - 1} điểm` : `${t.min}+ điểm`}</p>
                    {isCur && <span className="mt-1 rounded-full bg-primary-deep px-2 text-[10px] font-semibold text-primary-foreground">Bạn đang ở đây</span>}
                    <p className="mt-2 text-xs text-muted-foreground">{info.motto}</p>
                    <ul className="mt-2 space-y-1 text-left text-xs">{info.perks.map((p) => <li key={p}>✦ {p}</li>)}</ul>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Điểm tích lũy từ nhiệm vụ, điểm danh và thưởng do TML ghi nhận. Quyền lợi cụ thể do Ban Điều Hành cấu hình.</p>
          </div>
        </div>
      )}
    </div>
  );
}
