/** Google scope needed to read Meet conference records and participants. */
export const MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.readonly";
export const MEET_MIN_MINUTES = 30;
export const MEET_POINTS = { work: 2, club: 10 } as const;
export type MeetKind = keyof typeof MEET_POINTS;
export const MEET_KIND_LABEL: Record<MeetKind, string> = {
  work: "Họp làm việc",
  club: "Họp toàn thể",
};
export const CONFERENCE_RECORD_RE = /^conferenceRecords\/[A-Za-z0-9_-]{1,200}$/;

/** Raw participant as returned by meet.googleapis.com/v2/.../participants. */
export type MeetParticipantRaw = {
  signedinUser?: { user?: string; displayName?: string };
  anonymousUser?: { displayName?: string };
  phoneUser?: { displayName?: string };
};

export type ParticipantKind = "signed_in" | "anonymous" | "phone";
export type ParsedParticipant = { sub: string | null; displayName: string; kind: ParticipantKind };

/** Google account id from `users/{id}`; null for guests, phones or malformed ids. */
export function parseParticipant(p: MeetParticipantRaw): ParsedParticipant | null {
  if (p.signedinUser) {
    const m = /^users\/([0-9]{5,30})$/.exec(p.signedinUser.user ?? "");
    return {
      sub: m?.[1] ?? null,
      displayName: p.signedinUser.displayName?.trim() || "Không rõ tên",
      kind: "signed_in",
    };
  }
  if (p.anonymousUser)
    return {
      sub: null,
      displayName: p.anonymousUser.displayName?.trim() || "Khách",
      kind: "anonymous",
    };
  if (p.phoneUser)
    return {
      sub: null,
      displayName: p.phoneUser.displayName?.trim() || "Số điện thoại",
      kind: "phone",
    };
  return null;
}

/** Whole minutes between start and end; null while the meeting is still running or times are invalid. */
export function meetingMinutes(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return null;
  return Math.floor((e - s) / 60_000);
}

export function isScorableMeeting(start?: string | null, end?: string | null): boolean {
  const minutes = meetingMinutes(start, end);
  return minutes !== null && minutes >= MEET_MIN_MINUTES;
}

/** A linked Google account joined to its member row (server side). */
export type LinkedMember = {
  google_sub: string;
  id: string;
  full_name: string;
  member_code: string;
  department: string;
  position: string | null;
  status: string;
  is_leader: boolean;
};

export type MeetMember = {
  id: string;
  full_name: string;
  member_code: string;
  department: string;
  position: string | null;
  /** Name shown in Google Meet (only for matched / leader rows). */
  display_name?: string;
};

export type UnlinkedKind = ParticipantKind | "inactive";
export type UnlinkedParticipant = { display_name: string; kind: UnlinkedKind };

/**
 * Splits Meet participants into members who earn points, leaders (present, no points) and
 * people the system cannot score. Each Google account counts once even with several sessions.
 */
export function splitParticipants(
  participants: ParsedParticipant[],
  links: LinkedMember[],
): { matched: MeetMember[]; leaders: MeetMember[]; unlinked: UnlinkedParticipant[] } {
  const bySub = new Map(links.map((l) => [l.google_sub, l]));
  const seen = new Set<string>();
  const matched: MeetMember[] = [];
  const leaders: MeetMember[] = [];
  const unlinked: UnlinkedParticipant[] = [];
  for (const p of participants) {
    if (p.sub) {
      if (seen.has(p.sub)) continue;
      seen.add(p.sub);
      const link = bySub.get(p.sub);
      if (link) {
        const member: MeetMember = {
          id: link.id,
          full_name: link.full_name,
          member_code: link.member_code,
          department: link.department,
          position: link.position,
          display_name: p.displayName,
        };
        if (link.status !== "active")
          unlinked.push({ display_name: p.displayName, kind: "inactive" });
        else if (link.is_leader) leaders.push(member);
        else matched.push(member);
        continue;
      }
    }
    unlinked.push({ display_name: p.displayName, kind: p.kind });
  }
  const byName = (a: MeetMember, b: MeetMember) => a.full_name.localeCompare(b.full_name, "vi");
  return { matched: matched.sort(byName), leaders: leaders.sort(byName), unlinked };
}
