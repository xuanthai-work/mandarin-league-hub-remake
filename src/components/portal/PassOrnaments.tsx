import drum from "@/assets/dongson-drum.png.asset.json";
import birds from "@/assets/lac-birds.png.asset.json";

/** Đông Sơn bronze-drum face — the member-supplied original artwork (not redrawn). */
export function DongSonDrum({ className = "" }: { className?: string }) {
  return <img src={drum.url} alt="" aria-hidden draggable={false} className={`pointer-events-none absolute select-none object-contain opacity-[0.22] ${className}`} />;
}

/** Ring of Chim Lạc — the member-supplied original artwork (not redrawn). */
export function LacBirds({ className = "" }: { className?: string }) {
  return <img src={birds.url} alt="" aria-hidden draggable={false} className={`pointer-events-none absolute select-none object-contain opacity-[0.28] ${className}`} />;
}
