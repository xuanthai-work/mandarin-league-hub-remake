import { useEffect, useState } from "react";

/** A section measured in viewport coordinates, in document order. */
export type SectionBand = { id: string; top: number };

/**
 * The section a reader is looking at: the last one whose top has passed the
 * reading line (the header offset). Sections are expected in document order.
 * Pure so the landing-page behaviour can be unit-tested without a DOM.
 */
export function pickActiveSection(bands: readonly SectionBand[], line: number): string | null {
  let active: string | null = null;
  for (const band of bands) {
    if (band.top - line <= 0) active = band.id;
    else break;
  }
  return active;
}

/**
 * Tracks which landing section sits under the sticky header while scrolling.
 * `sectionIds` must be the ids of `<section>` elements already in the document;
 * returns `null` off the landing page (no sections) and during SSR.
 */
export function useScrollSpy(sectionIds: readonly string[], offset = 100): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const key = sectionIds.join("|");

  useEffect(() => {
    if (typeof window === "undefined" || !key) {
      setActiveId(null);
      return;
    }

    let frame = 0;
    let current: string | null = null;

    const measure = () => {
      frame = 0;
      const ids = key.split("|").filter(Boolean);
      const bands: SectionBand[] = [];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) bands.push({ id, top: el.getBoundingClientRect().top });
      }
      if (!bands.length) {
        current = null;
        setActiveId(null);
        return;
      }

      let next = pickActiveSection(bands, offset);
      // Short final sections can never reach the line, so the page bottom wins.
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) {
        next = bands[bands.length - 1]?.id ?? next;
      }
      if (next !== current) {
        current = next;
        setActiveId(next);
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    // Landing sections grow when news/classes/teachers finish loading, which
    // moves every anchor below them: re-measure on any document height change.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(document.body);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [key, offset]);

  return activeId;
}
