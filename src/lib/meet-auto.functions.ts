import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { DEPARTMENT_IDS } from "./permission-catalog";
import { CONFERENCE_RECORD_RE } from "./meet-attendance";
import type { AutoResult } from "./meet-auto.server";
import { canManageRoom, type AttendanceScope } from "./meet-room-access";
import type { RoomKind } from "./meet-auto";

export type MeetAutoStatus = {
  configured: boolean;
  missing: string[];
  canManage: boolean;
  scope: "all" | "own" | "view";
  department: string | null;
  userId: string;
};

async function requireAttendanceScopeAll(supabase: SupabaseClient<Database>): Promise<void> {
  const { data, error } = await supabase.rpc("perm_scope", { _action: "points.attendance" });
  if (error) throw new Error(error.message);
  if (data !== "all") {
    throw new Error(
      "Chỉ Co-founder hoặc Quản trị viên có quyền toàn Liên đoàn mới được thực hiện thao tác này.",
    );
  }
}

async function requireRoomManage(
  supabase: SupabaseClient<Database>,
  userId: string,
  room: { kind: RoomKind; department: string | null; createdBy: string | null },
): Promise<{ scope: AttendanceScope; department: string | null }> {
  const { data: scope, error: scopeErr } = await supabase.rpc("perm_scope", {
    _action: "points.attendance",
  });
  if (scopeErr) throw new Error(scopeErr.message);
  if (scope !== "all" && scope !== "own") {
    throw new Error("Bạn không có quyền quản lý phòng họp.");
  }

  const { data: memberRows } = await supabase.rpc("my_active_member");
  const dept = memberRows?.[0]?.department ?? null;

  if (!canManageRoom(scope, { userId, department: dept }, room)) {
    throw new Error("Bạn chỉ được quản lý phòng họp của Ban mình hoặc phòng chung do bạn tạo.");
  }

  return { scope, department: dept };
}

const scanMeetSchema = z.object({
  dryRun: z.boolean().optional(),
  force: z.boolean().optional(),
});

const createMeetingRoomSchema = z
  .object({
    kind: z.enum(["work", "club", "shared"]),
    department: z.string().trim().optional(),
    label: z.string().trim().min(1).max(80),
  })
  .superRefine((val, ctx) => {
    if (val.kind === "work") {
      if (val.department && !(DEPARTMENT_IDS as readonly string[]).includes(val.department)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ban phụ trách không hợp lệ.",
          path: ["department"],
        });
      }
    } else {
      if (val.department) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            val.kind === "shared"
              ? "Họp chung không được gắn với Ban cụ thể."
              : "Họp toàn thể không được gắn với Ban cụ thể.",
          path: ["department"],
        });
      }
    }
  });

const updateMeetingRoomSchema = z
  .object({
    id: z.string().uuid(),
    label: z.string().trim().min(1).max(80).optional(),
    active: z.boolean().optional(),
    kind: z.enum(["work", "club", "shared"]).optional(),
    department: z.string().trim().nullable().optional(),
  })
  .refine(
    (d) =>
      d.label !== undefined ||
      d.active !== undefined ||
      d.kind !== undefined ||
      d.department !== undefined,
    { message: "Phải có ít nhất một trường cần cập nhật." },
  );

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
    // 1. Kiểm quyền và tự điền department nếu scope own tạo phòng work
    const { data: scope, error: scopeErr } = await context.supabase.rpc("perm_scope", {
      _action: "points.attendance",
    });
    if (scopeErr) throw new Error(scopeErr.message);
    if (scope !== "all" && scope !== "own") {
      throw new Error("Bạn không có quyền quản lý phòng họp.");
    }

    const { data: memberRows } = await context.supabase.rpc("my_active_member");
    const actorDept = memberRows?.[0]?.department ?? null;

    let targetDept = data.department ?? null;
    if (data.kind === "work") {
      if (scope === "own") {
        if (!targetDept) targetDept = actorDept;
        if (targetDept !== actorDept) {
          throw new Error("Bạn chỉ được tạo phòng họp cho Ban của mình.");
        }
      } else {
        if (!targetDept || !(DEPARTMENT_IDS as readonly string[]).includes(targetDept)) {
          throw new Error("Họp làm việc bắt buộc chọn một Ban hợp lệ.");
        }
      }
    } else {
      targetDept = null;
    }

    await requireRoomManage(context.supabase, context.userId, {
      kind: data.kind,
      department: targetDept,
      createdBy: context.userId,
    });

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
        department: targetDept,
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

export const updateMeetingRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => updateMeetingRoomSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Đọc phòng hiện tại
    const { data: currentRoom, error: fetchErr } = await supabaseAdmin
      .from("meeting_rooms")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!currentRoom) throw new Error("Không tìm thấy phòng họp cần cập nhật.");

    // Kiểm tra quyền trên phòng hiện tại
    const { scope, department: actorDept } = await requireRoomManage(
      context.supabase,
      context.userId,
      {
        kind: currentRoom.kind as RoomKind,
        department: currentRoom.department,
        createdBy: currentRoom.created_by,
      },
    );

    // Scope 'own' không được đổi kind hay department
    if (scope === "own") {
      if (data.kind !== undefined && data.kind !== currentRoom.kind) {
        throw new Error("Bạn không thể thay đổi loại phòng họp.");
      }
      if (data.department !== undefined && data.department !== currentRoom.department) {
        throw new Error("Bạn không thể thay đổi Ban phụ trách phòng họp.");
      }
    }

    const nextKind = (data.kind ?? currentRoom.kind) as RoomKind;
    let nextDept: string | null;
    if (nextKind === "work") {
      nextDept = data.department !== undefined ? data.department : currentRoom.department;
      if (!nextDept || !(DEPARTMENT_IDS as readonly string[]).includes(nextDept)) {
        throw new Error("Họp làm việc bắt buộc chọn một Ban hợp lệ.");
      }
    } else {
      nextDept = null;
    }

    // Kiểm tra quyền trên trạng thái mới nếu có thay đổi cấu hình
    if (
      !canManageRoom(
        scope,
        { userId: context.userId, department: actorDept },
        { kind: nextKind, department: nextDept, createdBy: currentRoom.created_by },
      )
    ) {
      throw new Error("Bạn không có quyền quản lý phòng họp với cấu hình này.");
    }

    const updatePayload: Database["public"]["Tables"]["meeting_rooms"]["Update"] = {};
    if (data.label !== undefined) updatePayload.label = data.label;
    if (data.active !== undefined) updatePayload.active = data.active;
    if (data.kind !== undefined) updatePayload.kind = nextKind;
    if (data.kind !== undefined || data.department !== undefined) {
      updatePayload.department = nextDept;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("meeting_rooms")
      .update(updatePayload)
      .eq("id", data.id)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);
    return updated;
  });

export const deleteMeetingRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: currentRoom, error: fetchErr } = await supabaseAdmin
      .from("meeting_rooms")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!currentRoom) throw new Error("Không tìm thấy phòng họp cần xóa.");

    await requireRoomManage(context.supabase, context.userId, {
      kind: currentRoom.kind as RoomKind,
      department: currentRoom.department,
      createdBy: currentRoom.created_by,
    });

    const { error: delError } = await supabaseAdmin
      .from("meeting_rooms")
      .delete()
      .eq("id", data.id);

    if (delError) throw new Error(delError.message);
    return { success: true };
  });

export const getMeetRunAttendees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        conferenceRecord: z.string().regex(CONFERENCE_RECORD_RE),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("meet_run_attendees", {
      _conference_record: data.conferenceRecord,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getMeetAutoStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MeetAutoStatus> => {
    const { data: scope, error } = await context.supabase.rpc("perm_scope", {
      _action: "points.attendance",
    });
    if (error) throw new Error(error.message);

    let effectiveScope: "all" | "own" | "view";
    if (scope === "all" || scope === "own") {
      effectiveScope = scope;
    } else {
      const { data: hasView } = await context.supabase.rpc("has_perm", {
        _action: "meetings.view",
      });
      if (hasView) {
        effectiveScope = "view";
      } else {
        throw new Error("Bạn không có quyền truy cập thông tin phòng họp.");
      }
    }

    const { data: memberRows } = await context.supabase.rpc("my_active_member");
    const department = memberRows?.[0]?.department ?? null;

    if (effectiveScope === "view") {
      return {
        configured: true,
        missing: [],
        canManage: false,
        scope: "view",
        department,
        userId: context.userId,
      };
    }

    const requiredVars = [
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "MEET_BOT_REFRESH_TOKEN",
      "MEET_SCORER_USER_ID",
    ] as const;

    const missing = requiredVars.filter(
      (name) => !process.env[name] || process.env[name]!.trim().length === 0,
    );

    return {
      configured: missing.length === 0,
      missing,
      canManage: effectiveScope === "all",
      scope: effectiveScope,
      department,
      userId: context.userId,
    };
  });

export const setMeetingRoomActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        id: z.string().uuid(),
        active: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAttendanceScopeAll(context.supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("meeting_rooms")
      .update({ active: data.active })
      .eq("id", data.id)
      .select()
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Không tìm thấy phòng họp cần cập nhật.");
    return updated;
  });

export const rescoreMeetConference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        conferenceRecord: z.string().regex(CONFERENCE_RECORD_RE),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<AutoResult> => {
    await requireAttendanceScopeAll(context.supabase);

    const { processConference } = await import("./meet-auto.server");
    return processConference(data.conferenceRecord, { force: true });
  });
