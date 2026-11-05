export type SignedUrlCache = {
  /** Link còn dùng được (còn hạn > minRemainingMs), không có thì undefined. */
  get(path: string, now: number): string | undefined;
  /** Lưu link vừa ký, hết hạn tại now + ttlMs. */
  set(path: string, url: string, now: number): void;
  /** Xóa một path (ảnh bị thay hoặc xóa). */
  forget(path: string): void;
  /** Tách danh sách path thành phần đã có link và phần cần ký. */
  split(paths: string[], now: number): { hits: Map<string, string>; misses: string[] };
};

export type SignedUrlCacheOptions = {
  ttlMs: number;
  minRemainingMs: number;
};

type CacheEntry = {
  url: string;
  expiresAt: number;
};

export function createSignedUrlCache(opts: SignedUrlCacheOptions): SignedUrlCache {
  const map = new Map<string, CacheEntry>();

  const get = (path: string, now: number): string | undefined => {
    const entry = map.get(path);
    if (!entry) return undefined;
    if (entry.expiresAt - now <= opts.minRemainingMs) {
      map.delete(path);
      return undefined;
    }
    return entry.url;
  };

  const set = (path: string, url: string, now: number): void => {
    if (!url) return;
    map.set(path, {
      url,
      expiresAt: now + opts.ttlMs,
    });
  };

  const forget = (path: string): void => {
    map.delete(path);
  };

  const split = (paths: string[], now: number): { hits: Map<string, string>; misses: string[] } => {
    const hits = new Map<string, string>();
    const misses: string[] = [];
    const missesSet = new Set<string>();

    for (const path of paths) {
      const cached = get(path, now);
      if (cached !== undefined) {
        hits.set(path, cached);
      } else if (!missesSet.has(path)) {
        missesSet.add(path);
        misses.push(path);
      }
    }

    return { hits, misses };
  };

  return { get, set, forget, split };
}
