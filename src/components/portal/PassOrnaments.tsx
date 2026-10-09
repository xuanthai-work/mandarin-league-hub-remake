/** Đông Sơn bronze-drum sun (14 rays + concentric rings) — low-contrast watermark. */
export function DongSonDrum({ className = "" }: { className?: string }) {
  const rays = Array.from({ length: 14 }, (_, i) => (i * 360) / 14);
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={`tml-dongson ${className}`} fill="none" stroke="currentColor">
      <circle cx="100" cy="100" r="96" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="86" strokeWidth="0.8" strokeDasharray="2 3" />
      <circle cx="100" cy="100" r="72" strokeWidth="1" />
      <circle cx="100" cy="100" r="60" strokeWidth="0.6" strokeDasharray="1 4" />
      <circle cx="100" cy="100" r="44" strokeWidth="1" />
      <g fill="currentColor" stroke="none">
        {rays.map((a) => <path key={a} d="M100 100 L96 66 L100 30 L104 66 Z" transform={`rotate(${a} 100 100)`} />)}
        <circle cx="100" cy="100" r="9" />
      </g>
    </svg>
  );
}

/** Lạc Việt crane in flight — slim line art. */
export function Crane({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 120 50" aria-hidden className={`tml-crane ${className}`} fill="currentColor" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M2 30 C20 26 34 24 48 26 L60 8 C62 4 66 4 66 8 L64 26 C80 24 96 22 118 14 C104 26 88 32 66 34 L58 46 L54 46 L56 34 C38 34 20 34 2 30 Z" />
    </svg>
  );
}
