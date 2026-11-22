import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { DEPARTMENT_IDS } from "./permission-catalog";
import type { AutoResult } from "./meet-auto.server";

async function requireAttendanceScopeAll(supabase: SupabaseClient<Database>): Promise<void> {
  const { data, error } = await supabase.rpc("perm_scope", { _action: "points.attendance" });
  if (error) throw new Error(error.message);
  if (data !== "all") {
    throw new Error(
      "Chỉ Co-founder hoặc Quản trị viên có quyền toàn Liên đoàn mới được thực hiện thao tác này.",
    );
  }
}

const scanMeetSchema = z.object({
  dryRun: z.boolean().optional(),
  force: z.boolean().optional(),
});

const createMeetingRoomSchema = z
  .object({
    kind: z.enum(["work", "club"]),
    department: z.string().trim().optional(),
    label: z.string().trim().min(1).max(80),
  })
  .superRefine((val, ctx) => {
    if (val.kind === "work") {
      if (!val.department || !(DEPARTMENT_IDS as readonly string[]).includes(val.department)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Họp làm việc bắt buộc chọn một Ban hợp lệ.",
          path: ["department"],
        });
      }
    } else {
      if (val.department) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Họp toàn thể không được gắn với Ban cụ thể.",
          path: ["department"],
        });
      }
    }
  });

export const scanMeetNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => scanMeetSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<AutoResult[]> => {
    await requireAttendanceScopeAll(context.supabase);

    const { scanBotConferences } = await import("./meet-auto.server");
    return scanBotConferences({
      dryRun: data?.dryRun,
      force: data?.force,
    });
  });

export const createMeetingRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => createMeetingRoomSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAttendanceScopeAll(context.supabase);

    const { getBotAccessToken, meetPost } = await import("./meet-api.server");
    const token = await getBotAccessToken();

    type CreateSpaceResponse = {
      name: string;
      meetingUri: string;
    };

    const space = await meetPost<CreateSpaceResponse>(token, "spaces", {
      config: { accessType: "OPEN" },
    });

    if (!space?.name || !space?.meetingUri) {
      throw new Error("Google Meet không trả về thông tin phòng họp hợp lệ.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: newRoom, error: insertError } = await supabaseAdmin
      .from("meeting_rooms")
      .insert({
        label: data.label,
        kind: data.kind,
        department: data.kind === "work" ? data.department! : null,
        space_name: space.name,
        meeting_uri: space.meetingUri,
        created_by: context.userId,
        active: true,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(
        `Đã tạo phòng trên Google Meet (${space.name} - ${space.meetingUri}) nhưng lưu vào cơ sở dữ liệu thất bại: ${insertError.message}`,
      );
    }

    return newRoom;
  });
