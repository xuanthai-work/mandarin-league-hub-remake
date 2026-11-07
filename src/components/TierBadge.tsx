import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { Lock, X } from "lucide-react";
import { LEADER_TIER, TIERS, tierOf } from "@/lib/points";

const METAL: Record<string, string> = {
  bronze: "bronze",
  official: "emerald",
  silver: "azure",
  gold: "sapphire",
  excellent: "purple",
  platinum: "lavender",
  honor: "wine",
  leader: "obsidian",
};

export const TIER_INFO: Record<string, { zh: string; motto: string; perks: string[] }> = {
  bronze: {
    zh: "见习",
    motto: "Khởi đầu hành trình học hỏi và hòa nhập cùng Liên Đoàn.",
    perks: ["Thẻ thành viên chính thức", "Tham gia nhiệm vụ & dự án Ban"],
  },
  official: {
    zh: "正式",
    motto: "Đã hòa nhập, tham gia đều đặn sinh hoạt của Ban.",
    perks: ["Được giao nhiệm vụ riêng", "Tham gia hoạt động toàn Liên Đoàn"],
  },
  silver: {
    zh: "积极",
    motto: "Năng nổ, luôn có mặt trong sinh hoạt và nhiệm vụ Ban.",
    perks: ["Ưu tiên cấp quyền lợi học tập", "Được ghi nhận trong báo cáo Ban"],
  },
  gold: {
    zh: "骨干",
    motto: "Trụ cột chuyên môn, hoàn thành xuất sắc dự án lớn.",
    perks: ["Ưu tiên quyền lợi Premium", "Ưu tiên xét đề bạt Phó/Trưởng Ban"],
  },
  excellent: {
    zh: "优秀",
    motto: "Hiệu suất vượt trội, dẫn dắt đầu việc quan trọng của Ban.",
    perks: ["Đề cử khen thưởng định kỳ", "Ưu tiên tham gia dự án đối ngoại"],
  },
  platinum: {
    zh: "菁英",
    motto: "Tinh hoa của Liên Đoàn, gắn bó bền bỉ và có tầm ảnh hưởng.",
    perks: ["Vinh danh thường niên", "Đặc quyền Premium cao cấp"],
  },
  leader: {
    zh: "领导",
    motto: "Đồng sáng lập dẫn dắt Liên Đoàn Hán Ngữ.",
    perks: ["Thẻ Obsidian danh dự", "Không tính vào BXH điểm"],
  },
  honor: {
    zh: "荣誉",
    motto: "Vinh danh cống hiến tối cao cho Liên Đoàn Hán Ngữ.",
    perks: ["Bảng vàng Danh dự TML", "Đặc quyền cao nhất của TML"],
  },
};
const ENAMEL: Record<string, string> = {
  bronze: "var(--enamel-amber)",
  official: "var(--enamel-emerald)",
  silver: "var(--enamel-azure)",
  gold: "var(--pass-sapphire)",
  excellent: "var(--metal-purple-lo)",
  leader: "var(--enamel-obsidian)",
  platinum: "var(--pass-lavender)",
  honor: "var(--pass-wine)",
};
const GLYPH: Record<string, string> = {
  bronze: "习",
  official: "正",
  silver: "积",
  gold: "骨",
  excellent: "优",
  platinum: "菁",
  honor: "誉",
  leader: "领",
};
const GOLD_TRIM = ["gold", "platinum", "honor", "excellent", "leader"];
const HALO = ["gold", "excellent", "platinum", "honor", "leader"];
const CROWN = ["platinum", "honor", "leader"];

const star = (n: number, ro: number, ri: number, rot = -Math.PI / 2) =>
  Array.from({ length: n * 2 })
    .map((_, i) => {
      const r = i % 2 ? ri : ro;
      const a = rot + (i * Math.PI) / n;
      return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
    })
    .join(" ");

const SHIELD = "M50 6 L86 17 V47 C86 70 70 85 50 94 C30 85 14 70 14 47 V17 Z";

const pt = (r: number, a: number) =>
  `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
/** 10-petal lotus outline. */
const LOTUS =
  Array.from({ length: 10 })
    .map((_, i) => {
      const s = (2 * Math.PI) / 10,
        a0 = -Math.PI / 2 + i * s - s / 2,
        a1 = a0 + s,
        m = (a0 + a1) / 2;
      return `${i ? "" : `M${pt(36, a0)} `}Q${pt(50, a0 + s * 0.1)} ${pt(49, m)} Q${pt(50, a1 - s * 0.1)} ${pt(36, a1)}`;
    })
    .join(" ") + " Z";
/** 12-arm cross-flower: alternating long/short points. */
const CROSS12 = Array.from({ length: 24 })
  .map((_, i) => pt(i % 2 ? 38 : (i / 2) % 3 === 0 ? 50 : 44, -Math.PI / 2 + (i * Math.PI) / 12))
  .join(" ");
/** 12 sun rays: sharp triangles. */
const SUN = Array.from({ length: 36 })
  .map((_, i) => pt(i % 3 === 1 ? 50 : 37, -Math.PI / 2 + (i * Math.PI * 2) / 36))
  .join(" ");
const OBSIDIAN = "M50 4 L88 14 V46 C88 72 70 88 50 96 C30 88 12 72 12 46 V14 Z";

/** Each tier owns a unique silhouette. */
function Outer({ k, fill }: { k: string; fill: string }) {
  if (k === "bronze") return <path d={SHIELD} fill={fill} />;
  if (k === "official") return <polygon points={star(8, 49, 36)} fill={fill} />;
  if (k === "silver") return <polygon points="50,4 90,27 90,73 50,96 10,73 10,27" fill={fill} />;
  if (k === "gold") return <polygon points={CROSS12} fill={fill} />;
  if (k === "excellent") return <path d={LOTUS} fill={fill} />;
  if (k === "platinum") return <polygon points={star(16, 50, 40)} fill={fill} />;
  if (k === "honor") return <polygon points={SUN} fill={fill} />;
  return <path d={OBSIDIAN} fill={fill} />;
}

function Laurel({ color }: { color: string }) {
  return (
    <>
      {[0, 1].map((side) => (
        <g key={side} transform={side ? "translate(100,0) scale(-1,1)" : undefined}>
          <path d="M30 74 Q20 60 24 40" fill="none" style={{ stroke: color }} strokeWidth="1.2" />
          {[0, 1, 2, 3, 4].map((j) => {
            const y = 72 - j * 7.5,
              x = 27 - Math.sin(j / 2) * 3.5;
            return (
              <ellipse
                key={j}
                cx={x - 3}
                cy={y}
                rx="1.6"
                ry="4"
                transform={`rotate(${-55 + j * 9} ${x - 3} ${y})`}
                style={{ fill: color }}
              />
            );
          })}
        </g>
      ))}
    </>
  );
}

export function TierBadge({
  tierKey,
  size = 96,
  locked = false,
}: {
  tierKey: string;
  size?: number;
  locked?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const k = METAL[tierKey] ? tierKey : "bronze";
  const m = METAL[k]!;
  const v = (x: string) => `var(--metal-${m}${x})`;
  const gt = GOLD_TRIM.includes(k);
  const trim = gt ? "var(--metal-gold)" : v("");
  const trimHi = gt ? "var(--metal-gold-hi)" : v("-hi");
  const trimLo = gt ? "var(--metal-gold-lo)" : v("-lo");
  const detail = size >= 40;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-label={`Huy hiệu ${tierKey}`}
      className={locked ? "opacity-40 grayscale" : "drop-shadow-lg"}
    >
      <defs>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: trimHi }} />
          <stop offset="0.45" style={{ stopColor: trim }} />
          <stop offset="0.55" style={{ stopColor: trimHi }} />
          <stop offset="1" style={{ stopColor: trimLo }} />
        </linearGradient>
        <radialGradient id={`e${id}`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" style={{ stopColor: v("-hi") }} />
          <stop offset="0.35" style={{ stopColor: v("") }} />
          <stop offset="1" style={{ stopColor: ENAMEL[k] }} />
        </radialGradient>
        <radialGradient id={`a${id}`}>
          <stop
            offset="0.5"
            style={{
              stopColor:
                k === "platinum"
                  ? "var(--amethyst-glow)"
                  : k === "honor"
                    ? "var(--metal-gold-hi)"
                    : trimHi,
              stopOpacity: 0.8,
            }}
          />
          <stop offset="1" style={{ stopColor: trim, stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id={`s${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <Outer k={k} fill="#000" />
        </clipPath>
      </defs>

      {!locked && HALO.includes(k) && (
        <circle className="badge-aura" cx="50" cy="50" r="50" fill={`url(#a${id})`} />
      )}
      {(k === "platinum" || k === "honor") &&
        detail &&
        Array.from({ length: 16 }).map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={50 + 50 * Math.cos((i * Math.PI) / 8 + Math.PI / 16)}
            y2={50 + 50 * Math.sin((i * Math.PI) / 8 + Math.PI / 16)}
            style={{ stroke: k === "honor" ? "var(--metal-gold-hi)" : "var(--amethyst-glow)" }}
            strokeWidth="0.6"
            opacity="0.5"
          />
        ))}

      <Outer k={k} fill={`url(#m${id})`} />
      <g transform="translate(50 50) scale(0.9) translate(-50 -50)">
        <Outer k={k} fill="none" />
      </g>
      <g
        transform="translate(50 50) scale(0.88) translate(-50 -50)"
        style={{ stroke: trimLo }}
        strokeWidth="0.8"
        fill="none"
      >
        <Outer k={k} fill="none" />
      </g>

      {k === "bronze" &&
        detail &&
        [
          [24, 22],
          [76, 22],
          [24, 58],
          [76, 58],
          [50, 86],
        ].map(([x, y]) => (
          <circle
            key={`${x}${y}`}
            cx={x}
            cy={y}
            r="1.8"
            style={{ fill: trimHi, stroke: trimLo }}
            strokeWidth="0.5"
          />
        ))}
      {k === "leader" && (
        <circle
          cx="50"
          cy="66"
          r="2.6"
          style={{ fill: "var(--metal-pink)", stroke: "var(--metal-gold-hi)" }}
          strokeWidth="0.6"
        />
      )}
      {k === "platinum" &&
        Array.from({ length: 8 }).map((_, i) => {
          const a = -Math.PI / 2 + (i * Math.PI) / 4;
          return (
            <circle
              key={i}
              cx={50 + 42 * Math.cos(a)}
              cy={50 + 42 * Math.sin(a)}
              r="3"
              style={{ fill: "var(--metal-purple)", stroke: "var(--metal-gold-hi)" }}
              strokeWidth="0.8"
            />
          );
        })}

      {/* medallion */}
      <circle cx="50" cy="50" r="29" style={{ fill: trimLo }} />
      <circle cx="50" cy="50" r="27" fill={`url(#e${id})`} />
      {detail && (
        <g fill="none" style={{ stroke: v("-hi") }} opacity="0.35" strokeWidth="0.4">
          {[24, 21, 18].map((r) => (
            <circle key={r} cx="50" cy="50" r={r} strokeDasharray="1.2 1.2" />
          ))}
          {Array.from({ length: 24 }).map((_, i) => (
            <ellipse
              key={i}
              cx="50"
              cy="50"
              rx="25"
              ry="9"
              transform={`rotate(${i * 7.5} 50 50)`}
            />
          ))}
        </g>
      )}
      <circle cx="50" cy="50" r="27" fill="none" style={{ stroke: trimHi }} strokeWidth="0.8" />

      {HALO.includes(k) && detail && <Laurel color={trimHi} />}

      {CROWN.includes(k) && (
        <path
          d="M38 33 L41 25 L45 31 L50 22 L55 31 L59 25 L62 33 Z"
          style={{ fill: "var(--metal-gold-hi)", stroke: "var(--metal-gold-lo)" }}
          strokeWidth="0.6"
        />
      )}
      {k === "bronze" && detail && (
        <g style={{ stroke: trimHi }} strokeWidth="1.2" fill="none" strokeLinecap="round">
          <path d="M38 66 H62 M40 69 H60" />
          <path d="M50 64 V30 M50 40 Q43 37 42 31 Q49 33 50 40 M50 36 Q57 33 58 27 Q51 29 50 36" />
        </g>
      )}
      {(k === "silver" || k === "official") && detail && (
        <path
          d="M30 66 Q36 62 42 66 T54 66 T66 66 T72 66"
          fill="none"
          style={{ stroke: trimHi }}
          strokeWidth="1"
        />
      )}

      {!(k === "bronze" && detail) && (
        <text
          x="50"
          y={CROWN.includes(k) ? 58 : k === "bronze" ? 57 : 59}
          textAnchor="middle"
          fontSize={k === "bronze" ? 17 : 22}
          fontWeight="800"
          fontFamily="'Noto Serif SC', 'Songti SC', serif"
          style={{ fill: gt ? "var(--metal-gold-hi)" : trimHi, stroke: trimLo }}
          strokeWidth="0.6"
          paintOrder="stroke"
        >
          {GLYPH[k]}
        </text>
      )}
      {CROWN.includes(k) && (
        <path d="M44 66 Q50 60 56 66 Q50 70 44 66 Z" style={{ fill: "var(--metal-gold)" }} />
      )}

      {!locked && (
        <g clipPath={`url(#c${id})`}>
          <rect
            className="badge-sheen"
            x="20"
            y="-10"
            width="18"
            height="120"
            fill={`url(#s${id})`}
          />
        </g>
      )}
      {locked && (
        <g>
          <circle cx="78" cy="78" r="12" style={{ fill: "var(--primary-deep)" }} />
          <foreignObject x="70" y="70" width="16" height="16">
            <Lock className="h-4 w-4 text-primary-foreground" />
          </foreignObject>
        </g>
      )}
    </svg>
  );
}

export function TierProgress({
  points,
  isFounder = false,
}: {
  points: number;
  isFounder?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const realCur = tierOf(points);
  const cur = isFounder ? LEADER_TIER : realCur;
  // Founders see the exclusive 8th tier; everyone else only sees the 7 standard tiers.
  const asc = isFounder ? [...[...TIERS].reverse(), LEADER_TIER] : [...TIERS].reverse();
  const curIdx = asc.findIndex((t) => t.key === cur.key);
  const next = isFounder ? null : asc[curIdx + 1];
  const pct = isFounder
    ? 100
    : next
      ? Math.min(100, Math.round(((points - cur.min) / (next.min - cur.min)) * 100))
      : 100;
  return (
    <div className="mt-3 rounded-2xl border border-gold/25 bg-white/5 p-5 text-white backdrop-blur-md">
      <div className="flex items-center gap-4">
        <TierBadge tierKey={cur.key} size={84} />
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-gold/80">Danh hiệu hiện tại</p>
          <p className="text-2xl font-bold text-gold">
            {cur.label}{" "}
            <span className="font-serif text-lg text-white/70">{TIER_INFO[cur.key]?.zh}</span>
          </p>
          <p className="mt-1 text-xs text-white/70">{TIER_INFO[cur.key]?.motto}</p>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full border border-gold/20 bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-gold to-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.5)] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2.5 text-xs text-white/80">
        {isFounder ? (
          <>
            Bạn đang nắm giữ cấp bậc tối cao của TML:{" "}
            <b className="font-bold text-gold">LÃNH ĐẠO</b>
          </>
        ) : next ? (
          <>
            <span className="font-mono">
              {points}/{next.min} điểm
            </span>{" "}
            ({pct}%) · Còn <b className="font-bold text-gold">{next.min - points} điểm</b> để mở
            khóa <b className="font-bold text-gold">{next.label.toUpperCase()}</b>
          </>
        ) : (
          "Bạn đã đạt danh hiệu cao nhất của TML!"
        )}
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3.5 inline-flex items-center gap-1 text-sm font-semibold text-gold underline-offset-4 transition hover:text-yellow-300 hover:underline"
      >
        Xem bảng danh hiệu & đặc quyền →
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
            onClick={() => setOpen(false)}
          >
            <div
              className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gold/30 bg-[color:var(--portal-bg,#0d1527)]/98 p-6 text-white shadow-2xl shadow-black/90 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-gold">
                  {isFounder
                    ? "Thang bậc cống hiến & Vị trí Lãnh đạo"
                    : "Thang 7 bậc cống hiến TML"}
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng"
                  className="rounded-full border border-gold/20 p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {asc.map((t, i) => {
                  const info = TIER_INFO[t.key]!;
                  // Founders hold the leader card itself; the 7 contribution tiers stay tied to real points.
                  const reached = t.key === "leader" || points >= t.min;
                  const isCur = t.key === cur.key;
                  const rangeLabel =
                    t.key === "leader"
                      ? "Đặc quyền tối cao"
                      : t.key === "honor"
                        ? "401–450 điểm"
                        : asc[i + 1]
                          ? `${t.min}–${asc[i + 1]!.min - 1} điểm`
                          : `${t.min}+ điểm`;
                  return (
                    <div
                      key={t.key}
                      className={`relative flex flex-col items-center rounded-xl p-4 text-center transition ${
                        isCur
                          ? "border-2 border-gold bg-gradient-to-b from-amber-500/20 via-gold/10 to-transparent shadow-[0_0_20px_rgba(234,179,8,0.25)] ring-1 ring-gold/50"
                          : "border border-white/15 bg-white/5 hover:border-gold/40 hover:bg-white/10"
                      }`}
                    >
                      <TierBadge tierKey={t.key} size={88} locked={!reached} />
                      <p className="mt-2.5 text-base font-bold text-white">
                        {t.label} <span className="font-serif text-sm text-gold/80">{info.zh}</span>
                      </p>
                      <p className="font-mono text-xs font-semibold text-gold">{rangeLabel}</p>
                      {isCur && (
                        <span className="mt-1.5 rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-950 shadow-xs">
                          Bạn đang ở đây
                        </span>
                      )}
                      <p className="mt-2.5 text-xs text-white/70">{info.motto}</p>
                      <ul className="mt-3 space-y-1.5 text-left text-xs text-white/80">
                        {info.perks.map((p) => (
                          <li key={p} className="flex items-start gap-1.5">
                            <span className="shrink-0 text-gold">✦</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <p className="mt-5 border-t border-white/10 pt-4 text-xs text-white/60">
                Điểm tích lũy từ nhiệm vụ, điểm danh và thưởng do TML ghi nhận. Cấp bậc Lãnh đạo chỉ
                dành riêng cho Co-founder / Founder. Mọi vị trí khác (Ban Quản trị, Trưởng/Phó Ban,
                Cố vấn chuyên môn) đều hiển thị thẻ theo bậc điểm cống hiến thực tế. Quyền lợi cụ
                thể do Ban Điều Hành cấu hình.
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
