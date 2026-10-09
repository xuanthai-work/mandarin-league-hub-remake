/** Chim Lạc path (Đông Sơn style: long beak, crest, swept wings, fanned tail), facing right. */
const LAC = "M4 30 C14 27 22 26 30 27 L40 14 C43 9 48 8 50 12 L46 26 C56 24 62 22 68 18 L74 8 C78 4 84 4 86 8 L80 20 C86 20 92 18 98 15 L118 12 L100 20 C96 24 92 26 86 27 L78 30 C70 33 58 34 46 33 L38 42 L42 48 L34 46 L32 36 C24 35 14 33 4 30 Z M86 10 L94 2 L91 11 Z";

/** Đông Sơn bronze-drum face: 14-ray star, tangent-circle & hatched bands, flying Lạc birds ring. */
export function DongSonDrum({ className = "" }: { className?: string }) {
  const rays = Array.from({ length: 14 }, (_, i) => (i * 360) / 14);
  const dots = Array.from({ length: 28 }, (_, i) => (i * 360) / 28);
  const hatch = Array.from({ length: 72 }, (_, i) => i * 5);
  const birds = Array.from({ length: 10 }, (_, i) => i * 36);
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={`tml-dongson ${className}`} fill="none" stroke="currentColor">
      <circle cx="100" cy="100" r="98" strokeWidth="2" />
      <circle cx="100" cy="100" r="94" strokeWidth="0.8" />
      <g strokeWidth="0.7">{hatch.map((a) => <line key={a} x1="100" y1="6" x2="100" y2="11" transform={`rotate(${a} 100 100)`} />)}</g>
      <circle cx="100" cy="100" r="88" strokeWidth="0.8" />
      <g fill="currentColor" stroke="none">{birds.map((a) => <path key={a} d={LAC} transform={`rotate(${a} 100 100) translate(83 16) scale(0.29)`} />)}</g>
      <circle cx="100" cy="100" r="66" strokeWidth="1" />
      <g strokeWidth="0.8">{dots.map((a) => <circle key={a} cx="100" cy="40" r="3.6" transform={`rotate(${a} 100 100)`} />)}</g>
      <g fill="currentColor" stroke="none">{dots.map((a) => <circle key={a} cx="100" cy="40" r="1" transform={`rotate(${a} 100 100)`} />)}</g>
      <circle cx="100" cy="100" r="54" strokeWidth="1" />
      <g fill="currentColor" stroke="none">
        {rays.map((a) => <path key={a} d="M100 100 L95 70 L100 50 L105 70 Z" transform={`rotate(${a} 100 100)`} />)}
        <circle cx="100" cy="100" r="11" />
      </g>
    </svg>
  );
}

/** Large Chim Lạc in flight. */
export function Crane({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 120 50" aria-hidden className={`tml-crane ${className}`} fill="currentColor" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d={LAC} />
    </svg>
  );
}
