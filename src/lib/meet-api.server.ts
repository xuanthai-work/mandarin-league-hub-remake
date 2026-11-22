import type { LinkedMember, MeetParticipantRaw, ParsedParticipant } from "./meet-attendance";
import { parseParticipant } from "./meet-attendance";

export type ConferenceRecordRaw = {
  name: string;
  startTime?: string;
  endTime?: string;
  space?: string;
};

let cachedBotToken: { token: string; expiresAt: number } | null = null;

export function clearBotAccessTokenCache(): void {
  cachedBotToken = null;
}

export async function meetGet<T>(token: string, path: string): Promise<T> {
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

export async function meetPost<T>(token: string, path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`https://meet.googleapis.com/v2/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Không kết nối được Google Meet, vui lòng thử lại.");
  }
  if (res.status === 401) throw new Error("Phiên Google đã hết hạn, vui lòng kết nối lại.");
  if (res.status === 403)
    throw new Error("Tài khoản Google này không có quyền thao tác trên Google Meet.");
  if (res.status === 404) throw new Error("Không tìm thấy tài nguyên trên Google Meet.");
  if (!res.ok) throw new Error("Google Meet đang lỗi, vui lòng thử lại sau.");
  return (await res.json()) as T;
}

export async function getBotAccessToken(): Promise<string> {
  if (cachedBotToken && Date.now() < cachedBotToken.expiresAt) {
    return cachedBotToken.token;
  }

  const missing: string[] = [];
  const clientId = process.env["GOOGLE_OAUTH_CLIENT_ID"]?.trim();
  const clientSecret = process.env["GOOGLE_OAUTH_CLIENT_SECRET"]?.trim();
  const refreshToken = process.env["MEET_BOT_REFRESH_TOKEN"]?.trim();

  if (!clientId) missing.push("GOOGLE_OAUTH_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!refreshToken) missing.push("MEET_BOT_REFRESH_TOKEN");

  if (missing.length > 0) {
    throw new Error(`Thiếu biến môi trường: ${missing.join(", ")}`);
  }

  let res: Response;
  try {
    res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken!,
        grant_type: "refresh_token",
      }).toString(),
    });
  } catch {
    throw new Error("Không kết nối được dịch vụ OAuth của Google.");
  }

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    cachedBotToken = null;
    if (data.error === "invalid_grant") {
      throw new Error("Bot Google cần cấp quyền lại (invalid_grant).");
    }
    throw new Error(`Lấy token bot Google thất bại (${res.status}).`);
  }

  if (!data.access_token) {
    cachedBotToken = null;
    throw new Error("Google không trả về access token cho bot.");
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  const expiresAt = Date.now() + Math.max(0, (expiresIn - 60) * 1000);
  cachedBotToken = {
    token: data.access_token,
    expiresAt,
  };
  return data.access_token;
}

/** Every participant of a conference record (paged, at most 10 pages of 250). */
export async function fetchParticipants(
  token: string,
  record: string,
): Promise<ParsedParticipant[]> {
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
export async function linkedMembers(subs: string[]): Promise<LinkedMember[]> {
  if (subs.length === 0) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("member_google_accounts")
    .select(
      "google_sub, members!inner(id, full_name, member_code, department, position, status, is_leader, avatar_path)",
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
export async function fetchConferenceRecords(token: string): Promise<ConferenceRecordRaw[]> {
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

/** spaces/{id}: có buổi họp đang diễn ra không (activeConference). */
export async function getSpace(
  token: string,
  spaceName: string,
): Promise<{ activeConference?: { conferenceRecord: string } }> {
  if (!/^spaces\/[A-Za-z0-9_-]{1,100}$/.test(spaceName)) {
    throw new Error("Mã space Google Meet không hợp lệ.");
  }
  return meetGet<{ activeConference?: { conferenceRecord: string } }>(token, spaceName);
}

/** Đếm người đang ở trong một buổi họp: participants lọc "latestEndTime IS NULL" (tối đa 2 trang x 250). */
export async function countActiveParticipants(
  token: string,
  conferenceRecord: string,
): Promise<number> {
  let count = 0;
  let pageToken = "";
  for (let page = 0; page < 2; page += 1) {
    const qs = new URLSearchParams({
      pageSize: "250",
      filter: "latestEndTime IS NULL",
    });
    if (pageToken) qs.set("pageToken", pageToken);
    const data = await meetGet<{
      participants?: unknown[];
      nextPageToken?: string;
    }>(token, `${conferenceRecord}/participants?${qs.toString()}`);
    count += data.participants?.length ?? 0;
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return count;
}
