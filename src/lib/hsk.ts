import type { Database } from "@/integrations/supabase/types";
import { verifyLookup } from "@/lib/verify-lookup.functions";
import { supabase } from "@/integrations/supabase/client";
import type { HskRecord } from "@/lib/verification";

export const HSK_LEVELS: Record<string, string> = {
  HSK1: "HSK 1", HSK2: "HSK 2", HSK3: "HSK 3", HSK4: "HSK 4", HSK5: "HSK 5", HSK6: "HSK 6",
  "HSKK-BEG": "HSKK Sơ cấp", "HSKK-INT": "HSKK Trung cấp", "HSKK-ADV": "HSKK Cao cấp",
  "TML-4SKILL": "Đánh giá 4 kỹ năng TML",
};

/** Code prefixes the admin can tag a result with. */
export const HSK_PREFIXES = ["TMLHSK", "TMLHSKK", "TMLTEST"] as const;

/** Which score boxes a level uses — mirrors the database trigger that computes totals. */
export function hskSkills(level: string): ("listening" | "reading" | "writing" | "speaking")[] {
  if (level === "HSK1" || level === "HSK2") return ["listening", "reading"];
  if (level.startsWith("HSKK")) return ["speaking"];
  if (level === "TML-4SKILL") return ["listening", "reading", "writing", "speaking"];
  return ["listening", "reading", "writing"];
}
export function hskRule(level: string) {
  if (level === "HSK1" || level === "HSK2") return { max: 200, pass: 120 };
  if (level.startsWith("HSKK")) return { max: 100, pass: 60 };
  if (level === "TML-4SKILL") return { max: 400, pass: 240 };
  return { max: 300, pass: 180 };
}

const num = (v: number | null) => (typeof v === "number" ? v : undefined);

export async function lookupHsk(code: string, name = "", token = "", captcha = ""): Promise<HskRecord | null> {
  let data: Database["public"]["Functions"]["verify_hsk_v2"]["Returns"] | null;
  if (captcha) {
    const r = await verifyLookup({ data: { kind: "hsk", code, name, captcha } });
    if (!r.ok) throw new Error(r.error);
    data = r.rows as typeof data;
  } else {
    const res = await supabase.rpc("verify_hsk_v2", { _code: code, _name: name, _token: token });
    if (res.error) return null;
    data = res.data;
  }
  if (!data?.length) return null;
  const r = data[0]!;
  const rec: HskRecord = {
    kind: "hsk",
    verificationId: r.candidate_code,
    candidateName: r.candidate_name,
    examLevel: HSK_LEVELS[r.level] ?? r.level,
    examDate: r.exam_date,
    totalScore: r.total_score,
    maximumScore: r.max_score,
    passScore: r.pass_score,
    passed: r.passed,
    status: r.status as HskRecord["status"],
    issuer: r.issuer,
    isDemo: false,
    verifyToken: r.verify_token,
  };
  const opt = { listeningScore: num(r.listening_score), readingScore: num(r.reading_score), writingScore: num(r.writing_score), speakingScore: num(r.speaking_score) };
  for (const [k, v] of Object.entries(opt)) if (v !== undefined) (rec as unknown as Record<string, unknown>)[k] = v;
  if (r.candidate_name_zh) rec.candidateNameZh = r.candidate_name_zh;
  if (r.exam_session) rec.examSession = r.exam_session;
  if (r.revoked_at) rec.revokedAt = r.revoked_at;
  if (r.course_name) rec.courseName = r.course_name;
  if (r.class_name) rec.className = r.class_name;
  if (r.teacher_name) rec.teacherName = r.teacher_name;
  if (r.study_start) rec.studyStart = r.study_start;
  if (r.study_end) rec.studyEnd = r.study_end;
  return rec;
}
