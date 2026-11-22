import { countActiveParticipants, getBotAccessToken, getSpace } from "./meet-api.server";
import {
  isPresenceFresh,
  PRESENCE_CLAIM_MS,
  PRESENCE_TTL_MS,
  type RoomPresence,
} from "./meet-presence";

/**
 * Làm mới trạng thái có người trong phòng họp Meet.
 * Đệm kết quả 60s trong bảng meeting_room_presence, nhận việc nguyên tử (tối đa 30s).
 */
export async function refreshPresence(room: {
  id: string;
  space_name: string;
}): Promise<RoomPresence> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Đảm bảo có dòng bảng đệm
  await supabaseAdmin
    .from("meeting_room_presence")
    .upsert({ room_id: room.id }, { onConflict: "room_id", ignoreDuplicates: true });

  // 2. Đọc dòng hiện tại
  const { data: current } = await supabaseAdmin
    .from("meeting_room_presence")
    .select("*")
    .eq("room_id", room.id)
    .maybeSingle();

  if (current && isPresenceFresh(current.checked_at)) {
    return {
      roomId: room.id,
      active: current.active,
      count: current.participant_count,
      checkedAt: current.checked_at,
    };
  }

  // 3. Nhận việc nguyên tử
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const staleThresholdIso = new Date(now - PRESENCE_TTL_MS).toISOString();
  const claimThresholdIso = new Date(now - PRESENCE_CLAIM_MS).toISOString();

  const { data: claimedRows } = await supabaseAdmin
    .from("meeting_room_presence")
    .update({ refreshing_at: nowIso })
    .eq("room_id", room.id)
    .lt("checked_at", staleThresholdIso)
    .or(`refreshing_at.is.null,refreshing_at.lt.${claimThresholdIso}`)
    .select();

  if (!claimedRows || claimedRows.length === 0) {
    const isFresh = isPresenceFresh(current?.checked_at);
    return {
      roomId: room.id,
      active: current?.active ?? false,
      count: current?.participant_count ?? 0,
      checkedAt: current?.checked_at ?? "1970-01-01T00:00:00Z",
      stale: !isFresh,
    };
  }

  // 4. Gọi Google Meet API
  let active = false;
  let count = 0;

  try {
    const token = await getBotAccessToken();
    const spaceData = await getSpace(token, room.space_name);
    if (spaceData.activeConference?.conferenceRecord) {
      active = true;
      count = await countActiveParticipants(token, spaceData.activeConference.conferenceRecord);
    }
  } catch {
    // 6. Lỗi gọi Google (kể cả 429): giải phóng lock, trả cache cũ đánh dấu stale
    await supabaseAdmin
      .from("meeting_room_presence")
      .update({ refreshing_at: null })
      .eq("room_id", room.id);

    return {
      roomId: room.id,
      active: current?.active ?? false,
      count: current?.participant_count ?? 0,
      checkedAt: current?.checked_at ?? "1970-01-01T00:00:00Z",
      stale: true,
    };
  }

  // 5. Ghi nhận thành công
  const completedAt = new Date().toISOString();
  await supabaseAdmin
    .from("meeting_room_presence")
    .update({
      active,
      participant_count: count,
      checked_at: completedAt,
      refreshing_at: null,
    })
    .eq("room_id", room.id);

  return {
    roomId: room.id,
    active,
    count,
    checkedAt: completedAt,
  };
}
