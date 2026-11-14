import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type PillBox = { x: number; y: number; w: number; h: number };

/** Box of the active item relative to the container, or null when none is active. */
export function measureActive(container: HTMLElement, activeSelector: string): PillBox | null {
  const el = container.querySelector<HTMLElement>(activeSelector);
  if (!el) return null;
  return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
}

export type SlidingIndicatorOptions = {
  observeAttributes?: boolean;
};

/**
 * A white pill that slides under the active item of a segmented control or tab list.
 *
 * - `activeSelector`: CSS selector of the active item inside the container
 *   (Radix Tabs: `[data-state=active]`; ToggleGroup: `[data-state=on]`).
 * - `deps`: values that change when the selection changes (for example the selected value).
 * - `options`: optional flags, e.g. `observeAttributes` to watch `data-state` mutation via MutationObserver.
 *
 * The container must be `position: relative` and its items `position: relative` with a
 * higher z-index than the pill. `ready` is false until the first measurement, so callers
 * can keep the item's own background until the pill exists (no flash on first paint).
 */
export function useSlidingIndicator(
  activeSelector: string,
  deps: readonly unknown[] = [],
  options?: SlidingIndicatorOptions,
) {
  const nodeRef = useRef<HTMLElement | null>(null);
  const [box, setBox] = useState<PillBox | null>(null);
  const [animate, setAnimate] = useState(false);

  const measure = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    setBox((prev) => {
      const next = measureActive(node, activeSelector);
      if (prev === next) return prev;
      if (
        prev &&
        next &&
        prev.x === next.x &&
        prev.y === next.y &&
        prev.w === next.w &&
        prev.h === next.h
      ) {
        return prev;
      }
      return next;
    });
  }, [activeSelector]);

  const containerRef = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      if (node) measure();
    },
    [measure],
  );

  // Re-measure when the selection changes.
  const depsKey = JSON.stringify(deps);
  useIsoLayoutEffect(() => {
    measure();
  }, [measure, depsKey]);

  // Turn the transition on only after the first measurement so the pill does not fly in from 0.
  useEffect(() => {
    if (!box || animate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [box, animate]);

  // Keep the pill aligned when the container or fonts resize or attributes mutate.
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    let mo: MutationObserver | undefined;
    if (options?.observeAttributes && typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(() => measure());
      mo.observe(node, { attributes: true, subtree: true, attributeFilter: ["data-state"] });
    }

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(node);
    }

    void document.fonts?.ready?.then(measure);

    return () => {
      mo?.disconnect();
      ro?.disconnect();
    };
  }, [measure, options?.observeAttributes]);

  const ready = box !== null;

  const pill: ReactNode = box ? (
    <span
      aria-hidden
      data-slot="sliding-pill"
      className={`pointer-events-none absolute left-0 top-0 z-0 rounded-md bg-background shadow-2xs ${
        animate
          ? "transition-[transform,width,height] duration-(--motion-base) ease-soft motion-reduce:transition-none"
          : ""
      }`}
      style={{ width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)` }}
    />
  ) : null;

  return { containerRef, pill, ready };
}
