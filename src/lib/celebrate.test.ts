import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const confettiMock = vi.fn();
vi.mock("canvas-confetti", () => ({
  default: confettiMock,
}));

describe("celebrate", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      // @ts-expect-error restore environment
      delete window.matchMedia;
    }
    vi.restoreAllMocks();
  });

  it("fires confetti twice with zIndex: 100 when reduced motion is not requested", async () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    const { celebrate } = await import("./celebrate");

    await celebrate();

    expect(confettiMock).toHaveBeenCalledTimes(2);
    expect(confettiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        zIndex: 100,
        disableForReducedMotion: true,
        particleCount: 70,
        origin: { x: 0.25, y: 0.7 },
      }),
    );
    expect(confettiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        zIndex: 100,
        disableForReducedMotion: true,
        particleCount: 70,
        origin: { x: 0.75, y: 0.7 },
      }),
    );
  });

  it("does not fire confetti when prefers-reduced-motion is true", async () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    const { celebrate } = await import("./celebrate");

    await celebrate();

    expect(confettiMock).not.toHaveBeenCalled();
  });

  it("throttles calls within 1 second", async () => {
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    const { celebrate } = await import("./celebrate");

    await celebrate();
    expect(confettiMock).toHaveBeenCalledTimes(2);

    // Immediate second call within 1 second
    await celebrate();
    expect(confettiMock).toHaveBeenCalledTimes(2);
  });

  it("does not throw when window.matchMedia is missing", async () => {
    // @ts-expect-error simulate missing matchMedia
    delete window.matchMedia;
    const { celebrate } = await import("./celebrate");

    await expect(celebrate()).resolves.toBeUndefined();
    expect(confettiMock).toHaveBeenCalledTimes(2);
  });
});
