import { useId, useState } from "react";
import { Lock, X } from "lucide-react";
import { TIERS, tierOf } from "@/lib/points";

const METAL: Record<string, string> = { bronze: "bronze", silver: "silver", gold: "gold", platinum: "plat" };

export const TIER_INFO: Record<string, { zh: string; motto: string; perks: string[] }> = {
  bronze: { zh: "见习", motto: "Khởi đầu hành trình học hỏi và hòa nhập cùng Liên Đoàn.", perks: ["Thẻ thành viên chính thức", "Tham gia nhiệm vụ & dự án Ban"] },
  silver: { zh: "积极", motto: "Năng nổ, luôn có mặt trong sinh hoạt và nhiệm vụ Ban.", perks: ["Ưu tiên cấp quyền lợi học tập", "Được ghi nhận trong báo cáo Ban"] },
  gold: { zh: "骨干", motto: "Trụ cột chuyên môn, hoàn thành xuất sắc dự án lớn.", perks: ["Ưu tiên quyền lợi Premium", "Ưu tiên xét đề bạt Phó/Trưởng Ban"] },
  platinum: { zh: "精英", motto: "Vinh danh tối cao cho cống hiến bền bỉ và tầm ảnh hưởng.", perks: ["Vinh danh thường niên", "Đặc quyền cao nhất của TML"] },
};

function Emblem({ k }: { k: string }) {
  const s = { fill: "var(--sapphire)" };
  if (k === "bronze") return <g style={s}><rect x="38" y="58" width="24" height="6" rx="1" /><rect x="40" y="65" width="20" height="4" rx="1" /><path d="M50 56 C50 46 50 40 50 34 M50 44 C44 42 40 37 40 31 C46 32 50 37 50 44 M50 40 C56 38 60 33 60 27 C54 28 50 33 50 40" stroke="var(--sapphire)" strokeWidth="2.5" fill="none" strokeLinecap="round" /></g>;
  if (k === "silver") return <g style={s}><path d="M58 26 L62 30 L46 54 L41 56 L42 51 Z" /><path d="M32 62 Q41 56 50 62 T68 62" stroke="var(--sapphire)" strokeWidth="2.5" fill="none" strokeLinecap="round" /></g>;
  if (k === "gold") return <g style={s}><path d="M50 28 L64 33 V46 C64 55 58 61 50 65 C42 61 36 55 36 46 V33 Z" /><text x="50" y="52" textAnchor="middle" fontSize="16" fontWeight="700" style={{ fill: "var(--metal-gold-hi)" }}>骨</text></g>;
  return <g><path d="M34 40 L40 30 L45 38 L50 26 L55 38 L60 30 L66 40 L63 48 H37 Z" style={s} /><polygon points="50,50 57,57 50,68 43,57" style={{ fill: "var(--sapphire)", stroke: "var(--metal-plat-hi)", strokeWidth: 1.5 }} /></g>;
}

export function TierBadge({ tierKey, size = 96, locked = false }: { tierKey: string; size?: number; locked?: boolean }) {
  const id = useId().replace(/:/g, "");
  const m = METAL[tierKey] ?? "bronze";
  const v = (x: string) => `var(--metal-${m}${x})`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={`Huy hiệu ${tierKey}`} className={locked ? "opacity-40 grayscale" : "drop-shadow-lg"}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: v("-hi") }} /><stop offset="0.5" style={{ stopColor: v("") }} /><stop offset="1" style={{ stopColor: v("-lo") }} />
        </linearGradient>
        <radialGradient id={`r${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" style={{ stopColor: v("-hi") }} /><stop offset="1" style={{ stopColor: v("") }} />
        </radialGradient>
      </defs>
      {tierKey === "platinum" && Array.from({ length: 16 }).map((_, i) => (
        <line key={i} x1="50" y1="50" x2={50 + 49 * Math.cos((i * Math.PI) / 8)} y2={50 + 49 * Math.sin((i * Math.PI) / 8)} style={{ stroke: v("-hi") }} strokeWidth="1" opacity="0.6" />
      ))}
      <polygon points={Array.from({ length: 8 }).map((_, i) => { const a = (i * Math.PI) / 4 + Math.PI / 8; return `${50 + 44 * Math.cos(a)},${50 + 44 * Math.sin(a)}`; }).join(" ")} fill={`url(#g${id})`} />
      <circle cx="50" cy="50" r="34" fill={`url(#r${id})`} style={{ stroke: v("-lo") }} strokeWidth="2" />
      <circle cx="50" cy="50" r="30" fill="none" style={{ stroke: v("-hi") }} strokeWidth="0.8" strokeDasharray="2 2" />
      {(tierKey === "gold" || tierKey === "platinum") && [0, 1].map((side) => (
        <g key={side} transform={side ? "translate(100,0) scale(-1,1)" : undefined}>
          {[0, 1, 2, 3].map((j) => <ellipse key={j} cx={20 + j * 2} cy={68 - j * 10} rx="3" ry="6" transform={`rotate(${-30 + j * 12} ${20 + j * 2} ${68 - j * 10})`} style={{ fill: v("-lo") }} />)}
        </g>
      ))}
      <Emblem k={tierKey} />
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
