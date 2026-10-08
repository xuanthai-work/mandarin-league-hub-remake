/** Lightweight CSS-only floating crystals; GPU transforms, no JS loop, no pointer events. */
const P = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 3 + ((i * 7) % 5),
  delay: -((i * 2.3) % 18),
  dur: 16 + ((i * 5) % 12),
  gold: i % 3 !== 0,
}));

export function CrystalParticles() {
  return (
    <div aria-hidden className="crystal-field">
      {P.map((p, i) => (
        <span
          key={i}
          className={`crystal ${p.gold ? "crystal-gold" : "crystal-blue"}`}
          style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}
        />
      ))}
    </div>
  );
}
