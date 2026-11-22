import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RoomPresence } from "./meet-presence";

export const getRoomsPresence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RoomPresence[]> => {
    // 1. Kiểm tra quyền
    const { data: scope, error: scopeError } = await context.supabase.rpc("perm_scope", {
      _action: "points.attendance",
    });
    if (scopeError) throw new Error(scopeError.message);
    if (!scope) throw new Error("Bạn không có quyền truy cập thông tin điểm danh họp.");

    // 2. Kiểm tra cấu hình bot trước (ném lỗi nếu thiếu biến môi trường)
    const { getBotAccessToken } = await import("./meet-api.server");
    await getBotAccessToken();

    // 3. Lấy danh sách phòng qua client của user (chịu RLS theo scope own / all)
    const { data: rooms, error: roomsError } = await context.supabase
      .from("meeting_rooms")
      .select("id, space_name");

    if (roomsError) throw new Error(roomsError.message);

    // 4. Làm mới tuần tự từng phòng
    const { refreshPresence } = await import("./meet-presence.server");
    const results: RoomPresence[] = [];
    for (const r of rooms ?? []) {
      const p = await refreshPresence(r);
      results.push(p);
    }

    return results;
  });
