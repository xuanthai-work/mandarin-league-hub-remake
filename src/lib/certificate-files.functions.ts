import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Issues a short-lived download link only after re-verifying code + name/token. */
export const getCertificateFileUrl = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().min(3).max(50), name: z.string().max(120).default(""), token: z.string().max(40).default("") }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.rpc("verify_certificate_v2", { _code: data.code, _name: data.name, _token: data.token });
    const row = rows?.[0];
    if (!row || !row.has_file) return { url: null as string | null };
    const { data: cert } = await supabaseAdmin.from("certificates").select("file_path, file_name").eq("certificate_code", row.certificate_code).maybeSingle();
    if (!cert?.file_path) return { url: null };
    const { data: signed } = await supabaseAdmin.storage.from("certificate-files").createSignedUrl(cert.file_path, 300, { download: cert.file_name || true });
    return { url: signed?.signedUrl ?? null };
  });
