import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { createSignedUrlCache } from "@/lib/signed-url-cache";

/** Private bucket that holds every member avatar under `<user_id>/…`. */
export const AVATAR_BUCKET = "avatars";

const SIGN_TTL_SEC = 60 * 60 * 6; // 6 giờ
const urlCache = createSignedUrlCache({
  ttlMs: SIGN_TTL_SEC * 1000,
  minRemainingMs: 60 * 60 * 1000, // còn dưới 1 giờ thì ký lại
});

/**
 * Ký nhiều `avatar_path` trong một request (`createSignedUrls`) và dùng lại link
 * đã ký qua cache, nên danh sách thành viên chỉ tốn một lượt gọi storage.
 */
export async function resolveAvatarUrls(
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const cleanPaths = Array.from(new Set(paths.filter(Boolean) as string[]));
  if (!cleanPaths.length) return new Map();

  const useCache = typeof window !== "undefined";
  const now = Date.now();
  const { hits, misses } = useCache
    ? urlCache.split(cleanPaths, now)
    : { hits: new Map<string, string>(), misses: cleanPaths };

  if (misses.length) {
    const { data } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrls(misses, SIGN_TTL_SEC);
    for (const item of data ?? []) {
      if (!item.path || !item.signedUrl || item.error) continue;
      hits.set(item.path, item.signedUrl);
      if (useCache) urlCache.set(item.path, item.signedUrl, now);
    }
  }

  return hits;
}

/** Signed URL cho một `avatar_path` đã đổi ảnh (bỏ link cũ trong cache). */
export function forgetAvatarUrl(path: string | null | undefined) {
  if (path) urlCache.forget(path);
}

/** Hook lấy map `avatar_path → signed URL` cho một danh sách thành viên. */
export function useAvatarUrls(paths: (string | null | undefined)[]) {
  const cleanPaths = Array.from(new Set(paths.filter(Boolean) as string[])).sort();
  return useQuery({
    queryKey: ["avatar-urls", cleanPaths.join(",")],
    enabled: cleanPaths.length > 0,
    staleTime: 60 * 60 * 1000, // 1 giờ
    queryFn: () => resolveAvatarUrls(cleanPaths),
  });
}
