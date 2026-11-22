import { deptName } from "@/lib/recruitment";
import {
  type ConferenceRecordRaw,
  fetchConferenceRecords,
  fetchParticipants,
  getBotAccessToken,
  linkedMembers,
  meetGet,
} from "./meet-api.server";
import { CONFERENCE_RECORD_RE, splitParticipants, type ParsedParticipant } from "./meet-attendance";
import {
  AUTO_MIN_MINUTES,
  classifyConference,
  formatAutoReason,
  type AutoStatus,
} from "./meet-auto";

export type AutoResult = {
  conferenceRecord: string;
  status: AutoStatus | "skipped";
  detail: string;
  kind?: "work" | "club";
  roomLabel?: string;
  start?: string | null;
  end?: string | null;
  presentCount?: number;
  leaderCount?: number;
  unlinkedCount?: number;
  matchedNames?: string[];
};

export async function processConference(
  conferenceRecord: string,
  opts: { dryRun?: boolean | undefined; force?: boolean | undefined } = {},
): Promise<AutoResult> {
  // 1. Kiểm tra conferenceRecord
  if (!CONFERENCE_RECORD_RE.test(conferenceRecord)) {
    return {
      conferenceRecord,
      status: "error",
      detail: "Mã buổi họp không đúng định dạng.",
    };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 2. Nhận việc (claim) nguyên tử khi không phải dryRun
  if (!opts.dryRun) {
    const { error: insertError } = await supabaseAdmin.from("meet_auto_runs").insert({
      conference_record: conferenceRecord,
      status: "running",
      detail: "Đang xử lý",
    });

    if (insertError) {
      const { data: existing, error: readError } = await supabaseAdmin
        .from("meet_auto_runs")
        .select("*")
        .eq("conference_record", conferenceRecord)
        .maybeSingle();

      if (readError || !existing) {
        return {
          conferenceRecord,
          status: "error",
          detail: "Không thể kiểm tra trạng thái buổi họp hiện có.",
        };
      }

      if (existing.status === "scored" || existing.status === "too_short") {
        return {
          conferenceRecord,
          status: "skipped",
          detail: "Buổi họp đã được xử lý trước đó.",
        };
      }

      if (existing.status === "running") {
        const ageMs = Date.now() - new Date(existing.updated_at).getTime();
        const tenMinutesMs = 10 * 60 * 1000;
        if (ageMs < tenMinutesMs) {
          return {
            conferenceRecord,
            status: "skipped",
            detail: "Buổi họp đang được xử lý bởi tiến trình khác.",
          };
        }

        const { data: updated, error: updateError } = await supabaseAdmin
          .from("meet_auto_runs")
          .update({
            status: "running",
            detail: "Chiếm lại tiến trình (đã treo hơn 10 phút)",
            updated_at: new Date().toISOString(),
          })
          .eq("conference_record", conferenceRecord)
          .eq("status", existing.status)
          .select();

        if (updateError || !updated || updated.length === 0) {
          return {
            conferenceRecord,
            status: "skipped",
            detail: "Tiến trình khác đã chiếm lượt xử lý.",
          };
        }
      } else if (existing.status === "no_members") {
        if (!opts.force) {
          return {
            conferenceRecord,
            status: "skipped",
            detail: "Buổi họp không có thành viên (dùng force để thử lại).",
          };
        }

        const { data: updated, error: updateError } = await supabaseAdmin
          .from("meet_auto_runs")
          .update({
            status: "running",
            detail: "Thử lại buổi họp không có thành viên (force)",
            updated_at: new Date().toISOString(),
          })
          .eq("conference_record", conferenceRecord)
          .eq("status", existing.status)
          .select();

        if (updateError || !updated || updated.length === 0) {
          return {
            conferenceRecord,
            status: "skipped",
            detail: "Tiến trình khác đã chiếm lượt xử lý.",
          };
        }
      } else if (existing.status === "error" || existing.status === "unknown_room") {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("meet_auto_runs")
          .update({
            status: "running",
            detail: "Thử lại buổi họp bị lỗi hoặc chưa rõ phòng trước đó",
            updated_at: new Date().toISOString(),
          })
          .eq("conference_record", conferenceRecord)
          .eq("status", existing.status)
          .select();

        if (updateError || !updated || updated.length === 0) {
          return {
            conferenceRecord,
            status: "skipped",
            detail: "Tiến trình khác đã chiếm lượt xử lý.",
          };
        }
      }
    }
  }

  // 3. Đọc conferenceRecord bằng token bot
  let botToken: string;
  try {
    botToken = await getBotAccessToken();
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Lỗi khi lấy token bot Google.";
    if (!opts.dryRun) {
      await supabaseAdmin
        .from("meet_auto_runs")
        .update({
          status: "error",
          detail,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_record", conferenceRecord);
    }
    return { conferenceRecord, status: "error", detail };
  }

  let record: ConferenceRecordRaw;
  try {
    record = await meetGet<ConferenceRecordRaw>(botToken, conferenceRecord);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Lỗi khi đọc buổi họp từ Google Meet.";
    if (!opts.dryRun) {
      await supabaseAdmin
        .from("meet_auto_runs")
        .update({
          status: "error",
          detail,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_record", conferenceRecord);
    }
    return { conferenceRecord, status: "error", detail };
  }

  const start = record.startTime ?? null;
  const end = record.endTime ?? null;
  const space = record.space ?? null;

  const classification = classifyConference(start, end);
  if (classification === "not_ended") {
    if (!opts.dryRun) {
      // Xóa dòng running để lần quét sau tự động thử lại, không để treo
      await supabaseAdmin.from("meet_auto_runs").delete().eq("conference_record", conferenceRecord);
    }
    return {
      conferenceRecord,
      status: "skipped",
      detail: "Buổi họp chưa kết thúc hoặc thiếu thời gian hợp lệ.",
      start,
      end,
    };
  }

  if (classification === "too_short") {
    const detail = `Buổi họp dưới ${AUTO_MIN_MINUTES} phút, không đủ điều kiện chấm điểm.`;
    if (!opts.dryRun) {
      await supabaseAdmin
        .from("meet_auto_runs")
        .update({
          status: "too_short",
          detail,
          space_name: space,
          meeting_start: start,
          meeting_end: end,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_record", conferenceRecord);
    }
    return { conferenceRecord, status: "too_short", detail, start, end };
  }

  // 4. Tìm phòng
  const { data: room, error: roomError } = await supabaseAdmin
    .from("meeting_rooms")
    .select("*")
    .eq("space_name", space ?? "")
    .eq("active", true)
    .maybeSingle();

  if (roomError || !room) {
    const detail = `Phòng họp không thuộc danh sách chính thức hoặc không còn kích hoạt (${space || "không rõ space"}).`;
    if (!opts.dryRun) {
      await supabaseAdmin
        .from("meet_auto_runs")
        .update({
          status: "unknown_room",
          detail,
          space_name: space,
          meeting_start: start,
          meeting_end: end,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_record", conferenceRecord);
    }
    return { conferenceRecord, status: "unknown_room", detail, start, end };
  }

  // 5. Đọc người tham dự và khớp thành viên
  let participants: ParsedParticipant[];
  try {
    participants = await fetchParticipants(botToken, conferenceRecord);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Lỗi đọc người tham dự từ Google Meet.";
    if (!opts.dryRun) {
      await supabaseAdmin
        .from("meet_auto_runs")
        .update({
          status: "error",
          detail,
          room_id: room.id,
          space_name: space,
          meeting_start: start,
          meeting_end: end,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_record", conferenceRecord);
    }
    return {
      conferenceRecord,
      status: "error",
      detail,
      kind: room.kind as "work" | "club",
      roomLabel: room.label,
      start,
      end,
    };
  }

  const subs = [...new Set(participants.map((p) => p.sub).filter((s): s is string => Boolean(s)))];
  let links: Awaited<ReturnType<typeof linkedMembers>>;
  try {
    links = await linkedMembers(subs);
  } catch (err: unknown) {
    const rawMsg =
      err instanceof Error ? err.message : "Lỗi tra cứu tài khoản thành viên liên kết.";
    const detail = rawMsg.slice(0, 500);
    if (!opts.dryRun) {
      await supabaseAdmin
        .from("meet_auto_runs")
        .update({
          status: "error",
          detail,
          room_id: room.id,
          space_name: space,
          meeting_start: start,
          meeting_end: end,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_record", conferenceRecord);
    }
    return {
      conferenceRecord,
      status: "error",
      detail,
      kind: room.kind as "work" | "club",
      roomLabel: room.label,
      start,
      end,
    };
  }
  const split = splitParticipants(participants, links);

  const matchedCount = split.matched.length;
  const leaderCount = split.leaders.length;
  const unlinkedCount = split.unlinked.length;

  if (matchedCount === 0) {
    const detail = "Không có thành viên nào đủ điều kiện nhận điểm trong buổi họp.";
    if (!opts.dryRun) {
      await supabaseAdmin
        .from("meet_auto_runs")
        .update({
          status: "no_members",
          detail,
          room_id: room.id,
          space_name: space,
          meeting_start: start,
          meeting_end: end,
          present_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_record", conferenceRecord);
    }
    return {
      conferenceRecord,
      status: "no_members",
      detail,
      kind: room.kind as "work" | "club",
      roomLabel: room.label,
      start,
      end,
      presentCount: 0,
      leaderCount,
      unlinkedCount,
    };
  }

  // 6. dryRun: xem trước kết quả, không ghi gì vào DB
  if (opts.dryRun) {
    return {
      conferenceRecord,
      status: "scored",
      detail: "Dự kiến chấm điểm (dryRun)",
      kind: room.kind as "work" | "club",
      roomLabel: room.label,
      start,
      end,
      presentCount: matchedCount,
      leaderCount,
      unlinkedCount,
      matchedNames: split.matched.map((m) => m.full_name),
    };
  }

  // 7. Chấm điểm qua RPC record_meet_attendance
  const scorer = process.env["MEET_SCORER_USER_ID"]?.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!scorer || !uuidRegex.test(scorer)) {
    const detail = "Thiếu hoặc sai định dạng biến môi trường: MEET_SCORER_USER_ID (phải là UUID).";
    await supabaseAdmin
      .from("meet_auto_runs")
      .update({
        status: "error",
        detail,
        room_id: room.id,
        space_name: space,
        meeting_start: start,
        meeting_end: end,
        updated_at: new Date().toISOString(),
      })
      .eq("conference_record", conferenceRecord);
    return {
      conferenceRecord,
      status: "error",
      detail,
      kind: room.kind as "work" | "club",
      roomLabel: room.label,
      start,
      end,
    };
  }

  const departmentLabel = room.department ? deptName(room.department) : null;
  const reason = formatAutoReason(room.kind as "work" | "club", departmentLabel, start!);
  const matchedIds = split.matched.map((m) => m.id);

  const { data: sessionId, error: rpcError } = await supabaseAdmin.rpc("record_meet_attendance", {
    _actor: scorer,
    _conference_record: conferenceRecord,
    _meeting_kind: room.kind,
    _meeting_start: start!,
    _meeting_end: end!,
    _matched: matchedIds,
    _manual: [],
    _reason: reason,
  });

  if (rpcError) {
    if (rpcError.message.includes("đã được điểm danh rồi")) {
      const { data: existingSession } = await supabaseAdmin
        .from("attendance_sessions")
        .select("id")
        .eq("conference_record", conferenceRecord)
        .maybeSingle();

      const sid = existingSession?.id ?? null;
      const detail = "Buổi họp đã được chấm điểm trước đó trong hệ thống.";
      await supabaseAdmin
        .from("meet_auto_runs")
        .update({
          status: "scored",
          detail,
          room_id: room.id,
          space_name: space,
          attendance_session_id: sid,
          meeting_start: start,
          meeting_end: end,
          present_count: matchedCount,
          updated_at: new Date().toISOString(),
        })
        .eq("conference_record", conferenceRecord);

      return {
        conferenceRecord,
        status: "scored",
        detail,
        kind: room.kind as "work" | "club",
        roomLabel: room.label,
        start,
        end,
        presentCount: matchedCount,
        leaderCount,
        unlinkedCount,
      };
    }

    const detail = rpcError.message.slice(0, 500);
    await supabaseAdmin
      .from("meet_auto_runs")
      .update({
        status: "error",
        detail,
        room_id: room.id,
        space_name: space,
        meeting_start: start,
        meeting_end: end,
        updated_at: new Date().toISOString(),
      })
      .eq("conference_record", conferenceRecord);

    return {
      conferenceRecord,
      status: "error",
      detail,
      kind: room.kind as "work" | "club",
      roomLabel: room.label,
      start,
      end,
    };
  }

  // 8. Thành công: ghi nhận trạng thái scored
  const detail = `Đã tự động cộng điểm cho ${matchedCount} thành viên.`;
  await supabaseAdmin
    .from("meet_auto_runs")
    .update({
      status: "scored",
      detail,
      present_count: matchedCount,
      attendance_session_id: sessionId as string,
      meeting_start: start,
      meeting_end: end,
      room_id: room.id,
      space_name: space,
      updated_at: new Date().toISOString(),
    })
    .eq("conference_record", conferenceRecord);

  return {
    conferenceRecord,
    status: "scored",
    detail,
    kind: room.kind as "work" | "club",
    roomLabel: room.label,
    start,
    end,
    presentCount: matchedCount,
    leaderCount,
    unlinkedCount,
  };
}

export async function scanBotConferences(
  opts: {
    dryRun?: boolean | undefined;
    force?: boolean | undefined;
    limit?: number | undefined;
  } = {},
): Promise<AutoResult[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? 25, 100));
  const botToken = await getBotAccessToken();
  const allRecords = await fetchConferenceRecords(botToken);

  const ended = allRecords.filter((r) => Boolean(r.endTime));

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existingRuns } = await supabaseAdmin
    .from("meet_auto_runs")
    .select("conference_record, status");

  const skipSet = new Set<string>();
  for (const row of existingRuns ?? []) {
    if (row.status === "scored" || row.status === "too_short") {
      skipSet.add(row.conference_record);
    } else if (row.status === "no_members" && !opts.force) {
      skipSet.add(row.conference_record);
    }
  }

  const results: AutoResult[] = [];
  for (const rec of ended) {
    if (results.length >= limit) break;
    if (skipSet.has(rec.name)) continue;

    try {
      const res = await processConference(rec.name, opts);
      results.push(res);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "Lỗi xử lý buổi họp bất ngờ.";
      const detail = rawMsg.slice(0, 500);
      results.push({
        conferenceRecord: rec.name,
        status: "error",
        detail,
      });
    }
  }

  results.sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""));
  return results;
}
