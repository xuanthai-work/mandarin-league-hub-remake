import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether motion is acceptable right now. Pure so it can be unit-tested:
 * `true` when the person has NOT asked for reduced motion, and `true` on the
 * server or in browsers without matchMedia (nothing to read there).
 */
export function readMotionOk(
  matchMedia: ((query: string) => { matches: boolean }) | undefined,
): boolean {
  if (typeof matchMedia !== "function") return true;
  return !matchMedia(QUERY).matches;
}

/**
 * Motion preference for JavaScript-driven effects (confetti, 3D tilt, count-ups).
 *
 * The first render always returns `true` (same on server and client, so no
 * hydration mismatch); the real preference is read after mount and kept in sync
 * when the setting changes. Because of that, use it for effects that start from a
 * user action or after mount. Effects that play on first paint must be CSS and be
 * covered by the `[data-motion]` rule in `styles.css`.
 */
export function useMotionOk(): boolean {
  const [ok, setOk] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(QUERY);
    const sync = () => setOk(!media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return ok;
}
