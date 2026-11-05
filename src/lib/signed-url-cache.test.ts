import { describe, expect, it } from "vitest";
import { createSignedUrlCache } from "./signed-url-cache";

describe("signed-url-cache", () => {
  const ONE_HOUR = 60 * 60 * 1000;
  const SIX_HOURS = 6 * ONE_HOUR;

  it("1. set then get immediately returns the correct url", () => {
    const cache = createSignedUrlCache({ ttlMs: SIX_HOURS, minRemainingMs: ONE_HOUR });
    const now = 1_000_000;
    cache.set("photo1.jpg", "https://example.com/photo1.jpg", now);
    expect(cache.get("photo1.jpg", now)).toBe("https://example.com/photo1.jpg");
  });

  it("2. returns url when remaining > minRemainingMs, undefined when <= minRemainingMs", () => {
    const cache = createSignedUrlCache({ ttlMs: SIX_HOURS, minRemainingMs: ONE_HOUR });
    const setTime = 1_000_000;
    cache.set("photo1.jpg", "https://example.com/photo1.jpg", setTime);

    // Remaining: 6h - 4h = 2h > 1h -> hit
    const fourHoursLater = setTime + 4 * ONE_HOUR;
    expect(cache.get("photo1.jpg", fourHoursLater)).toBe("https://example.com/photo1.jpg");

    // Remaining: 6h - 5h = 1h <= minRemainingMs (1h) -> expired (miss)
    const fiveHoursLater = setTime + 5 * ONE_HOUR;
    expect(cache.get("photo1.jpg", fiveHoursLater)).toBeUndefined();

    // Expired item should be deleted from cache
    expect(cache.get("photo1.jpg", fiveHoursLater + 1)).toBeUndefined();
  });

  it("3. forget removes the cached url", () => {
    const cache = createSignedUrlCache({ ttlMs: SIX_HOURS, minRemainingMs: ONE_HOUR });
    const now = 1_000_000;
    cache.set("photo1.jpg", "https://example.com/photo1.jpg", now);
    expect(cache.get("photo1.jpg", now)).toBe("https://example.com/photo1.jpg");

    cache.forget("photo1.jpg");
    expect(cache.get("photo1.jpg", now)).toBeUndefined();
  });

  it("4. split separates hits and deduplicated misses", () => {
    const cache = createSignedUrlCache({ ttlMs: SIX_HOURS, minRemainingMs: ONE_HOUR });
    const now = 1_000_000;

    cache.set("valid.jpg", "https://example.com/valid.jpg", now);
    cache.set("expiring.jpg", "https://example.com/expiring.jpg", now - (5 * ONE_HOUR + 1)); // remaining < 1h

    const { hits, misses } = cache.split(
      ["valid.jpg", "expiring.jpg", "missing.jpg", "missing.jpg", "expiring.jpg"],
      now,
    );

    expect(hits.get("valid.jpg")).toBe("https://example.com/valid.jpg");
    expect(hits.has("expiring.jpg")).toBe(false);
    expect(hits.has("missing.jpg")).toBe(false);

    // misses should contain expiring.jpg and missing.jpg, deduplicated
    expect(misses).toEqual(["expiring.jpg", "missing.jpg"]);
  });

  it("5. set with empty string does not create cache entry", () => {
    const cache = createSignedUrlCache({ ttlMs: SIX_HOURS, minRemainingMs: ONE_HOUR });
    const now = 1_000_000;

    cache.set("empty.jpg", "", now);
    expect(cache.get("empty.jpg", now)).toBeUndefined();

    const { misses } = cache.split(["empty.jpg"], now);
    expect(misses).toEqual(["empty.jpg"]);
  });
});
