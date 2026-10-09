import drum from "@/assets/dongson-drum-v2.png.asset.json";
import crane from "@/assets/lac-crane.png.asset.json";

/** Đông Sơn bronze-drum face — member-supplied original artwork, background removed only. */
export function DongSonDrum({ className = "" }: { className?: string }) {
  return <img src={drum.url} alt="" aria-hidden draggable={false} className={`pointer-events-none absolute select-none object-contain opacity-[0.18] ${className}`} />;
}

type Bird = { top: string; left: string; w: number; o: number };

/** Flock made of identical copies of the member-supplied crane artwork (never redrawn or distorted). */
export function LacBirds({ flock, className = "" }: { flock: Bird[]; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      {flock.map((b, i) => (
        <img key={i} src={crane.url} alt="" draggable={false} className="absolute h-auto select-none"
          style={{ top: b.top, left: b.left, width: b.w, opacity: b.o }} />
      ))}
    </div>
  );
}

export const FLOCK_H: Bird[] = [
  { top: "40%", left: "34%", w: 70, o: 0.22 },
  { top: "54%", left: "44%", w: 56, o: 0.18 },
  { top: "66%", left: "30%", w: 46, o: 0.15 },
];

export const FLOCK_V: Bird[] = [
  { top: "17%", left: "6%", w: 54, o: 0.2 },
  { top: "24%", left: "68%", w: 60, o: 0.2 },
  { top: "31%", left: "10%", w: 40, o: 0.16 },
];
