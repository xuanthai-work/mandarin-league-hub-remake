/**
 * Pass ornaments.
 *
 * Only local `/public` artwork is used here. The old `*.asset.json` imports
 * pointed at `/__l5e/assets-v1/...`, a Lovable preview-host path that does not
 * exist on the production domain — every ornament rendered as a broken-image
 * "?" box on the member pass.
 */
const DRUM_SRC = "/dongson-vector.svg";

/** Đông Sơn bronze-drum face — member-supplied original artwork, background removed only. */
export function DongSonDrum({ className = "" }: { className?: string }) {
  return (
    <img
      src={DRUM_SRC}
      alt=""
      aria-hidden
      draggable={false}
      className={`pointer-events-none absolute select-none object-contain opacity-[0.42] ${className}`}
    />
  );
}
