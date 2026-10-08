import { supabase } from "@/integrations/supabase/client";
import type { CertificateRecord } from "@/lib/verification";

export const CERT_TYPES: Record<string, string> = {
  completion: "Chứng nhận hoàn thành khóa học",
  recognition: "Chứng nhận Ban tổ chức / Thành viên",
  contribution: "Chứng nhận tình nguyện viên",
  achievement: "Chứng nhận thành tích",
  participation: "Chứng nhận tham gia",
  other: "Chứng nhận khác",
};

/** Remove every whitespace and upper-case — codes never contain spaces. */
export const normalizeCode = (v: string) => v.replace(/\s+/g, "").toUpperCase();

export async function lookupCertificate(code: string): Promise<CertificateRecord | null> {
  const { data, error } = await supabase.rpc("verify_certificate", { _code: normalizeCode(code) });
  if (error || !data?.length) return null;
  const r = data[0]!;
  return {
    kind: "certificate",
    verificationId: r.certificate_code,
    holderName: r.holder_name,
    courseName: r.program_name,
    level: r.classification || "Hoàn thành",
    issueDate: r.issue_date,
    status: r.status as CertificateRecord["status"],
    issuer: r.issuer,
    typeLabel: CERT_TYPES[r.certificate_type] ?? "Chứng nhận",
    ...(r.expiry_date ? { expiryDate: r.expiry_date } : {}),
    ...(r.revoked_at ? { revokedAt: r.revoked_at } : {}),
    isDemo: false,
  };
}
