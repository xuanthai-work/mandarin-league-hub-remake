import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(3000).default(""),
  priority: z.enum(["low", "medium", "high"]),
  due_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  points: z.coerce.number().int().min(0).max(100),
  assignee_id: z.string().uuid().optional(),
  assigned_by_note: z.string().trim().max(200).default(""),
});

/**
 * Edit a task in place: only its assigner (`tasks.created_by`) or an admin with `tasks.edit` for
 * the task's own department may change it, and completed tasks stay immutable so the points
 * ledger and evidence remain auditable.
 */
export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => updateTaskSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .select("id, department, status, assignee_id, points, created_by")
      .eq("id", data.taskId)
      .single();
    if (error || !task) throw new Error("Nhiệm vụ không tồn tại.");

    const { data: canEdit } = await context.supabase.rpc("has_perm", {
      _action: "tasks.edit",
      _dept: task.department,
    });
    if (!canEdit) throw new Error("Bạn không có quyền chỉnh sửa nhiệm vụ này.");

    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin && task.created_by !== context.userId) {
      throw new Error("Chỉ người giao việc mới được chỉnh sửa nhiệm vụ này.");
    }

    if (task.status === "done") {
      throw new Error("Không thể chỉnh sửa nhiệm vụ đã hoàn thành.");
    }
    if (data.points !== task.points && ![5, 10, 20].includes(data.points)) {
      throw new Error("Điểm thưởng chỉ nhận 5, 10 hoặc 20.");
    }

    /** A Linear-style task always has exactly one assignee; a re-assignment follows that member's department. */
    const patch: {
      title: string;
      description: string;
      priority: string;
      due_on: string | null;
      points: number;
      assigned_by_note: string;
      assignee_id?: string;
      department?: string;
    } = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      due_on: data.due_on ?? null,
      points: data.points,
      assigned_by_note: data.assigned_by_note,
    };

    if (data.assignee_id && data.assignee_id !== task.assignee_id) {
      const { data: member, error: memberError } = await supabaseAdmin
        .from("members")
        .select("id, status, department")
        .eq("id", data.assignee_id)
        .maybeSingle();
      if (memberError || !member || member.status !== "active") {
        throw new Error("Thành viên được chọn không hợp lệ hoặc đã ngừng hoạt động.");
      }
      if (member.department !== task.department) {
        const { data: canAssign } = await context.supabase.rpc("has_perm", {
          _action: "tasks.create",
          _dept: member.department,
        });
        if (!canAssign) throw new Error("Bạn không có quyền giao việc cho Ban của thành viên này.");
      }
      patch.assignee_id = member.id;
      patch.department = member.department;
    }

    const { error: updateError } = await supabaseAdmin
      .from("tasks")
      .update(patch)
      .eq("id", data.taskId);
    if (updateError) throw new Error(updateError.message);

    return { ok: true };
  });

/**
 * Members a task may be assigned to: active profiles that already have an internal login account.
 * Without an account the member cannot sign in, report evidence or earn points, so they never
 * appear in the assignment picker. The admin client is used only for the account ids; the member
 * list itself stays RLS-scoped (admins see every department, heads only their own).
 */
export const getAssignableMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: members, error }, { data: accounts }] = await Promise.all([
      context.supabase
        .from("members")
        .select("id, full_name, member_code, department")
        .eq("status", "active")
        .order("full_name"),
      supabaseAdmin.from("member_accounts").select("member_id, account_status"),
    ]);
    if (error) throw new Error(error.message);

    const withLogin = new Set(
      (accounts ?? [])
        // Only an activated account can sign in, receive work and report evidence.
        .filter((a) => a.account_status === "active")
        .map((a) => a.member_id),
    );
    return (members ?? []).filter((m) => withLogin.has(m.id));
  });
