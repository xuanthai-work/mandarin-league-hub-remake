import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSystemStatus } from "./system-status";

export const getSystemStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const started = Date.now();
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const dbLatencyMs = Date.now() - started;
    if (error) throw new Error("Không kết nối được cơ sở dữ liệu.");
    if (!isAdmin) throw new Error("Chỉ Quản trị viên được xem trạng thái hệ thống.");
    return {
      checkedAt: new Date().toISOString(),
      dbLatencyMs,
      integrations: buildSystemStatus(process.env),
    };
  });
