import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Signs images only for content that is publicly published; storage itself is not readable by visitors. */
export const signPublicImages = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        bucket: z.enum(["activity-banners", "news-covers", "partner-logos"]),
        paths: z.array(z.string().min(1).max(300)).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (!data.paths.length) return {} as Record<string, string>;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let allowed: string[] = [];
    if (data.bucket === "activity-banners") {
      const { data: r } = await supabaseAdmin
        .from("activities")
        .select("banner_path")
        .in("banner_path", data.paths)
        .in("manual_status", ["published", "cancelled"])
        .is("deleted_at", null);
      allowed = (r ?? []).map((x) => x.banner_path);
    } else if (data.bucket === "news-covers") {
      const { data: r } = await supabaseAdmin
        .from("news_articles")
        .select("cover_path")
        .in("cover_path", data.paths)
        .eq("status", "published")
        .is("deleted_at", null);
      allowed = (r ?? []).map((x) => x.cover_path);
    } else {
      const { data: r } = await supabaseAdmin
        .from("partners")
        .select("logo_path")
        .in("logo_path", data.paths)
        .eq("is_active", true)
        .is("deleted_at", null);
      allowed = (r ?? []).map((x) => x.logo_path);
    }
    allowed = [...new Set(allowed.filter(Boolean))];
    if (!allowed.length) return {} as Record<string, string>;
    const { data: signed } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUrls(allowed, 60 * 60 * 6);
    const out: Record<string, string> = {};
    for (const s of signed ?? []) if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
    return out;
  });

/** Public signed URLs first; remaining paths (drafts) are signed with the caller's own access (managers only). */
export async function signImages(
  bucket: "activity-banners" | "news-covers" | "partner-logos",
  paths: string[],
) {
  const uniq = [...new Set(paths.filter(Boolean))];
  const map = new Map<string, string>();
  if (!uniq.length) return map;
  try {
    const pub = await signPublicImages({ data: { bucket, paths: uniq } });
    for (const [k, v] of Object.entries(pub)) map.set(k, v);
  } catch {
    /* fall through */
  }
  const rest = uniq.filter((p) => !map.has(p));
  if (rest.length) {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.storage.from(bucket).createSignedUrls(rest, 60 * 60 * 6);
    for (const d of data ?? []) if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  }
  return map;
}
