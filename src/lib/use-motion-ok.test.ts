import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readMotionOk, useMotionOk } from "./use-motion-ok";

describe("readMotionOk", () => {
  it("returns true when matchMedia is undefined", () => {
    expect(readMotionOk(undefined)).toBe(true);
  });

  it("returns true when matches is false, and false when matches is true", () => {
    expect(readMotionOk(() => ({ matches: false }))).toBe(true);
    expect(readMotionOk(() => ({ matches: true }))).toBe(false);
  });

  it("calls matchMedia with (prefers-reduced-motion: reduce)", () => {
    const fn = vi.fn().mockReturnValue({ matches: false });
    readMotionOk(fn);
    expect(fn).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });
});

describe("useMotionOk", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      // @ts-expect-error cleanup mock property
      delete window.matchMedia;
    }
    vi.restoreAllMocks();
  });

  function setupMatchMedia(initialMatches: boolean) {
    let currentMatches = initialMatches;
    const listeners = new Set<() => void>();

    const mediaQueryList = {
      get matches() {
        return currentMatches;
      },
      addEventListener: vi.fn((event: string, listener: () => void) => {
        if (event === "change") {
          listeners.add(listener);
        }
      }),
      removeEventListener: vi.fn((event: string, listener: () => void) => {
        if (event === "change") {
          listeners.delete(listener);
        }
      }),
      dispatchChange(newMatches: boolean) {
        currentMatches = newMatches;
        for (const listener of listeners) {
          listener();
        }
      },
      listeners,
    };

    window.matchMedia = vi
      .fn()
      .mockReturnValue(mediaQueryList) as unknown as typeof window.matchMedia;

    return { mediaQueryList };
  }

  it("returns false after mount when window.matchMedia reports matches: true", () => {
    setupMatchMedia(true);

    const { result } = renderHook(() => useMotionOk());
    expect(result.current).toBe(false);
  });

  it("returns true when matches: false", () => {
    setupMatchMedia(false);

    const { result } = renderHook(() => useMotionOk());
    expect(result.current).toBe(true);
  });

  it("updates to false when change event fires with matches changing from false to true", () => {
    const { mediaQueryList } = setupMatchMedia(false);

    const { result } = renderHook(() => useMotionOk());
    expect(result.current).toBe(true);

    act(() => {
      mediaQueryList.dispatchChange(true);
    });

    expect(result.current).toBe(false);
  });

  it("removes event listener on unmount", () => {
    const { mediaQueryList } = setupMatchMedia(false);

    const { unmount } = renderHook(() => useMotionOk());
    expect(mediaQueryList.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(mediaQueryList.listeners.size).toBe(1);

    unmount();

    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(mediaQueryList.listeners.size).toBe(0);
  });
});
