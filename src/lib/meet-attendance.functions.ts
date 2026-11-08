import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  CONFERENCE_RECORD_RE,
  MEET_POINTS,
  isScorableMeeting,
  meetingMinutes,
  parseParticipant,
  splitParticipants,
  type LinkedMember,
  type MeetKind,
  type MeetMember,
  type MeetParticipantRaw,
  type ParsedParticipant,
  type UnlinkedParticipant,
} from "./meet-attendance";

const accessToken = z.string().min(20).max(4096);
const conferenceRecord = z.string().regex(CONFERENCE_RECORD_RE);

type ConferenceRecordRaw = { name: string; startTime?: string; endTime?: string; space?: string };

type RecordedSession = {
  meeting_kind: string;
  present_count: number;
  created_by_label: string;
  created_at: string;
};

export type MeetConference = {
  name: string;
  start: string;
  end: string | null;
  minutes: number | null;
  scorable: boolean;
  recorded: RecordedSession | null;
};

export type MeetPreview = {
  conferenceRecord: string;
  start: string;
  end: string | null;
  minutes: number | null;
  scorable: boolean;
  recorded: RecordedSession | null;
  canClub: boolean;
  matched: MeetMember[];
  leaders: MeetMember[];
  unlinked: UnlinkedParticipant[];
  candidates: MeetMember[];
};

async function meetGet<T>(token: string, path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`https://meet.googleapis.com/v2/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Không kết nối được Google Meet, vui lòng thử lại.");
  }
  if (res.status === 401) throw new Error("Phiên Google đã hết hạn, vui lòng kết nối lại.");
  if (res.status === 403)
    throw new Error(
      "Tài khoản Google này không đọc được buổi họp đó (cần là chủ phòng hoặc người dự).",
    );
  if (res.status === 404)
    throw new Error("Không tìm thấy buổi họp trên Google Meet (có thể đã quá 30 ngày).");
  if (!res.ok) throw new Error("Google Meet đang lỗi, vui lòng thử lại sau.");
  return (await res.json()) as T;
}

/** 'own' or 'all' for points.attendance, or throws. */
async function attendanceScope(supabase: SupabaseClient<Database>): Promise<"own" | "all"> {
  const { data, error } = await supabase.rpc("perm_scope", { _action: "points.attendance" });
  if (error) throw new Error(error.message);
  if (data !== "own" && data !== "all") throw new Error("Bạn không có quyền chấm điểm danh.");
  return data;
}

/** Every participant of a conference record (paged, at most 10 pages of 250). */
async function fetchParticipants(token: string, record: string): Promise<ParsedParticipant[]> {
  const out: ParsedParticipant[] = [];
  let pageToken = "";
  for (let page = 0; page < 10; page += 1) {
    const qs = new URLSearchParams({ pageSize: "250" });
    if (pageToken) qs.set("pageToken", pageToken);
    const data = await meetGet<{ participants?: MeetParticipantRaw[]; nextPageToken?: string }>(
      token,
      `${record}/participants?${qs.toString()}`,
    );
    for (const raw of data.participants ?? []) {
      const parsed = parseParticipant(raw);
      if (parsed) out.push(parsed);
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return out;
}

/** Linked members for the given Google ids (admin client: the table has no client policies). */
async function linkedMembers(subs: string[]): Promise<LinkedMember[]> {
  if (subs.length === 0) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("member_google_accounts")
    .select(
      "google_sub, members!inner(id, full_name, member_code, department, position, status, is_leader)",
    )
    .in("google_sub", subs);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as {
    google_sub: string;
    members: Omit<LinkedMember, "google_sub">;
  }[];
  return rows.map((row) => ({ google_sub: row.google_sub, ...row.members }));
}

/** Conference records of the last 30 days for this Google account (API paging, max 3 pages). */
async function fetchConferenceRecords(token: string): Promise<ConferenceRecordRaw[]> {
  const out: ConferenceRecordRaw[] = [];
  let pageToken = "";
  for (let page = 0; page < 3; page += 1) {
    const qs = new URLSearchParams({ pageSize: "100" });
    if (pageToken) qs.set("pageToken", pageToken);
    const data = await meetGet<{
      conferenceRecords?: ConferenceRecordRaw[];
      nextPageToken?: string;
    }>(token, `conferenceRecords?${qs.toString()}`);
    out.push(...(data.conferenceRecords ?? []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return out;
}

/** Read the record's times and participants, then split them against the linked members. */
async function readMeeting(token: string, record: string) {
  const raw = await meetGet<ConferenceRecordRaw>(token, record);
  const start = raw.startTime ?? null;
  const end = raw.endTime ?? null;
  if (!start) throw new Error("Buổi họp chưa có giờ bắt đầu trên Google Meet.");
  const participants = await fetchParticipants(token, record);
  const subs = [...new Set(participants.map((p) => p.sub).filter((s): s is string => Boolean(s)))];
  const split = splitParticipants(participants, await linkedMembers(subs));
  return { start, end, split };
}

async function recordedSessions(
  supabase: SupabaseClient<Database>,
  records: string[],
): Promise<(RecordedSession & { conference_record: string })[]> {
  const { data, error } = await supabase.rpc("meet_recorded_sessions", { _records: records });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const listMeetConferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ accessToken }).parse(d))
  .handler(async ({ data, context }) => {
    await attendanceScope(context.supabase);
    const raw = await fetchConferenceRecords(data.accessToken);
    const rows = await recordedSessions(
      context.supabase,
      raw.map((r) => r.name),
    );
    const byName = new Map(rows.map((r) => [r.conference_record, r]));
    const conferences: MeetConference[] = raw
      .filter((r) => Boolean(r.startTime))
      .map((r) => {
        const hit = byName.get(r.name);
        const start = r.startTime!;
        const end = r.endTime ?? null;
        return {
          name: r.name,
          start,
          end,
          minutes: meetingMinutes(start, end),
          scorable: isScorableMeeting(start, end),
          recorded: hit
            ? {
                meeting_kind: hit.meeting_kind,
                present_count: hit.present_count,
                created_by_label: hit.created_by_label,
                created_at: hit.created_at,
              }
            : null,
        };
      })
      .sort((a, b) => b.start.localeCompare(a.start));
    return conferences;
  });

export const previewMeetAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ accessToken, conferenceRecord }).parse(d))
  .handler(async ({ data, context }): Promise<MeetPreview> => {
    const scope = await attendanceScope(context.supabase);
    const { start, end, split } = await readMeeting(data.accessToken, data.conferenceRecord);

    // Hand-added members: the caller's department when scoped, everyone for the Co-founder.
    let myDept: string | null = null;
    if (scope === "own") {
      const { data: mine, error } = await context.supabase.rpc("my_active_member");
      if (error) throw new Error(error.message);
      myDept = mine?.[0]?.department ?? null;
    }
    const candidates: MeetMember[] = [];
    if (scope === "all" || myDept) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let q = supabaseAdmin
        .from("members")
        .select("id, full_name, member_code, department, position")
        .eq("status", "active")
        .eq("is_leader", false);
      if (scope === "own") q = q.eq("department", myDept!);
      const { data: rows, error } = await q.order("full_name");
      if (error) throw new Error(error.message);
      const matchedIds = new Set(split.matched.map((m) => m.id));
      for (const m of rows ?? []) if (!matchedIds.has(m.id)) candidates.push(m);
    }

    const recorded = (await recordedSessions(context.supabase, [data.conferenceRecord]))[0] ?? null;

    return {
      conferenceRecord: data.conferenceRecord,
      start,
      end,
      minutes: meetingMinutes(start, end),
      scorable: isScorableMeeting(start, end),
      recorded: recorded
        ? {
            meeting_kind: recorded.meeting_kind,
            present_count: recorded.present_count,
            created_by_label: recorded.created_by_label,
            created_at: recorded.created_at,
          }
        : null,
      canClub: scope === "all",
      matched: split.matched,
      leaders: split.leaders,
      unlinked: split.unlinked,
      candidates,
    };
  });

export const recordMeetAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        accessToken,
        conferenceRecord,
        kind: z.enum(["work", "club"]),
        manual: z.array(z.string().uuid()).max(200),
        reason: z.string().trim().min(3).max(300),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const scope = await attendanceScope(context.supabase);
    if (data.kind === "club" && scope !== "all")
      throw new Error("Chỉ Co-founder hoặc Quản trị viên được chấm Họp toàn thể.");

    // Read the roster from Google again; the browser only sends the hand-added members.
    const { start, end, split } = await readMeeting(data.accessToken, data.conferenceRecord);
    if (!end || !isScorableMeeting(start, end))
      throw new Error("Chỉ chấm buổi họp đã kết thúc và kéo dài từ 30 phút.");

    const kind: MeetKind = data.kind;
    const matchedIds = split.matched.map((m) => m.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sessionId, error } = await supabaseAdmin.rpc("record_meet_attendance", {
      _actor: context.userId,
      _conference_record: data.conferenceRecord,
      _meeting_kind: kind,
      _meeting_start: start,
      _meeting_end: end,
      _matched: matchedIds,
      _manual: data.manual,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);

    return {
      sessionId,
      scored: new Set([...matchedIds, ...data.manual]).size,
      points: MEET_POINTS[kind],
    };
  });
