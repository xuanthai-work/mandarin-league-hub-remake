import { readMotionOk } from "@/lib/use-motion-ok";

let lastFired = 0;

/**
 * Fire a short confetti burst for a milestone the person just caused (approving a task,
 * creating an account). Safe to call anywhere: it does nothing on the server, when the
 * person asked for reduced motion, or if called again within one second.
 * canvas-confetti is loaded on demand so it never weighs on the first page load.
 */
export async function celebrate(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!readMotionOk(window.matchMedia?.bind(window))) return;

  const now = Date.now();
  if (now - lastFired < 1000) return;
  lastFired = now;

  const { default: confetti } = await import("canvas-confetti");
  const base = { zIndex: 100, disableForReducedMotion: true, ticks: 160 } as const;
  confetti({
    ...base,
    particleCount: 70,
    spread: 70,
    startVelocity: 45,
    origin: { x: 0.25, y: 0.7 },
  });
  confetti({
    ...base,
    particleCount: 70,
    spread: 70,
    startVelocity: 45,
    origin: { x: 0.75, y: 0.7 },
  });
}
