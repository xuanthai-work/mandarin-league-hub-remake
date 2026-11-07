import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PermissionCode } from "@/lib/permission-catalog";
import { LEADER_DEFAULT_POINTS, isFounder } from "@/lib/points";

const status = z.enum(["inactive", "active", "suspended", "disabled"]);

type Ctx = { supabase: SupabaseClient; userId: string };

async function serviceDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function rpcBool(ctx: Ctx, fn: string, args: Record<string, unknown>) {
  const { data, error } = await ctx.supabase.rpc(fn as never, args as never);
  if (error) throw new Error(error.message);
  return data === true;
}
const isAdmin = (ctx: Ctx) => rpcBool(ctx, "is_admin", {});
const hasPerm = (ctx: Ctx, action: PermissionCode, dept: string | null) =>
  rpcBool(ctx, "has_perm", { _action: action, _dept: dept });
const outranks = (ctx: Ctx, memberId: string) => rpcBool(ctx, "outranks", { _member: memberId });
const canAssign = (ctx: Ctx, position: string) =>
  rpcBool(ctx, "can_assign_position", { _position: position });
async function must(ok: Promise<boolean>, message: string) {
  if (!(await ok)) throw new Error(message);
}

const ban = (s: string) => (s === "active" ? "none" : "876000h");

/** The admin flag is the only role kept in user_roles. */
async function setAdminFlag(db: SupabaseClient, userId: string, on: boolean) {
  if (on) {
    const { error } = await db
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
  }
}

async function adminCount(db: SupabaseClient) {
  const { count } = await db
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

export const getAdminMemberAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: scope } = await context.supabase.rpc("perm_scope", {
      _action: "members.edit",
    });
    if (!scope) return [];
    const db = await serviceDb();
    const [{ data: accts }, { data: roles }] = await Promise.all([
      db
        .from("member_accounts")
        .select(
          "user_id, member_id, login_email, account_status, must_change_password, members(department)",
        ),
      db.from("user_roles").select("user_id, role"),
    ]);

    const rolesOf = new Map<string, string[]>();
    for (const r of roles ?? []) {
      rolesOf.set(r.user_id, [...(rolesOf.get(r.user_id) ?? []), r.role]);
    }

    /** Scope "own" is filtered to the caller's department; admins always resolve to "all". */
    const restrictDept = !(await isAdmin(context)) && scope === "own";
    let myDept: string | null = null;
    if (restrictDept) {
      const { data: me } = await context.supabase.rpc("my_active_member");
      myDept = me?.[0]?.department ?? null;
    }

    return (accts ?? [])
      .filter((a) => {
        if (!restrictDept) return true;
        const member = a.members as { department: string } | null;
        return myDept !== null && member?.department === myDept;
      })
      .map((a) => ({
        userId: a.user_id as string,
        memberId: a.member_id as string,
        email: a.login_email as string,
        status: a.account_status as string,
        mustChange: a.must_change_password as boolean,
        isAdmin: (rolesOf.get(a.user_id) ?? []).includes("admin"),
      }));
  });

/**
 * Member ids the caller may see whose internal account is activated. The points screens use it to
 * keep profiles that cannot sign in (no account, inactive/suspended account) off the roster,
 * podium, attendance and bonus/penalty pickers while `/admin/members` still lists everyone.
 */
export const getActiveAccountMemberIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: members, error }, { data: accounts }] = await Promise.all([
      // RLS keeps heads scoped to their own departments.
      context.supabase.from("members").select("id"),
      supabaseAdmin.from("member_accounts").select("member_id, account_status"),
    ]);
    if (error) throw new Error(error.message);

    const active = new Set(
      (accounts ?? []).filter((a) => a.account_status === "active").map((a) => a.member_id),
    );
    return (members ?? []).map((m) => m.id).filter((id) => active.has(id));
  });

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        memberId: z.string().uuid().optional(),
        newMember: z
          .object({
            full_name: z.string().trim().min(2).max(120),
            phone: z.string().max(30).default(""),
          })
          .optional(),
        email: z.preprocess(
          (v) =>
            String(v ?? "")
              .replace(/[\s\u200B-\u200D\uFEFF]/g, "")
              .toLowerCase(),
          z.string().email("Email đăng nhập không hợp lệ.").max(200),
        ),
        password: z.string().min(8).max(72),
        department: z.string().min(2).max(40),
        position: z.string().min(2).max(40),
        isAdmin: z.boolean().default(false),
        status,
        mustChange: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await serviceDb();
    const admin = await isAdmin(context);
    await must(
      hasPerm(context, "members.edit", data.department),
      "Bạn không có quyền tạo tài khoản cho Ban này.",
    );
    await must(canAssign(context, data.position), "Chỉ được gán chức vụ thấp hơn chức vụ của bạn.");
    if (data.isAdmin && !admin) throw new Error("Chỉ Quản trị viên được cấp cờ Quản trị viên.");

    let memberId = data.memberId;
    if (memberId) {
      const { data: linked } = await db
        .from("member_accounts")
        .select("user_id")
        .eq("member_id", memberId)
        .maybeSingle();
      if (linked) throw new Error("Thành viên này đã có tài khoản nội bộ.");
      const { data: member } = await db
        .from("members")
        .select("department, position")
        .eq("id", memberId)
        .single();
      if (!member) throw new Error("Không tìm thấy thành viên.");
      await must(
        outranks(context, memberId),
        "Chỉ được cấp tài khoản cho người có chức vụ thấp hơn bạn.",
      );
      if (member.department !== data.department || member.position !== data.position) {
        await must(
          hasPerm(context, "members.edit", member.department),
          "Bạn không có quyền đổi Ban hoặc chức vụ của thành viên này.",
        );
        await must(
          hasPerm(context, "members.edit", data.department),
          "Bạn không có quyền đổi Ban hoặc chức vụ của thành viên này.",
        );
      }
      // Cấp lại tài khoản cũng đưa hồ sơ đã "Đã rời" trở lại hoạt động.
      await db
        .from("members")
        .update({
          department: data.department,
          position: data.position,
          email: data.email,
          status: "active",
          left_on: null,
        })
        .eq("id", memberId);
    } else {
      await must(
        hasPerm(context, "members.edit", data.department),
        "Bạn không có quyền thêm thành viên vào Ban này.",
      );
      if (!data.newMember) throw new Error("Cần chọn hoặc nhập thông tin thành viên.");
      const { data: m, error } = await db
        .from("members")
        .insert({
          ...data.newMember,
          email: data.email,
          department: data.department,
          position: data.position,
          // Only founders / co-founders start at the 400-point floor.
          contribution_points: isFounder(data.position) ? LEADER_DEFAULT_POINTS : 0,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      memberId = m.id;
    }
    const { data: created, error: authErr } = await db.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      ban_duration: ban(data.status),
    });
    if (authErr || !created.user)
      throw new Error(
        authErr?.message?.includes("already")
          ? "Email này đã có tài khoản."
          : (authErr?.message ?? "Không tạo được tài khoản."),
      );
    const uid = created.user.id;
    const { error: aErr } = await db.from("member_accounts").insert({
      user_id: uid,
      member_id: memberId,
      login_email: data.email,
      account_status: data.status,
      must_change_password: data.mustChange,
    });
    if (aErr) {
      await db.auth.admin.deleteUser(uid);
      throw new Error(aErr.message);
    }
    if (data.isAdmin) await setAdminFlag(db, uid, true);
    return { ok: true };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        department: z.string().min(2).max(40),
        position: z.string().min(2).max(40),
        isAdmin: z.boolean(),
        status,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await serviceDb();
    const admin = await isAdmin(context);
    const [{ data: acct }, { data: cur }] = await Promise.all([
      db
        .from("member_accounts")
        .select("member_id, members(department, position)")
        .eq("user_id", data.userId)
        .maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", data.userId),
    ]);
    if (!acct) throw new Error("Không tìm thấy tài khoản.");
    const member = acct.members as { department: string; position: string } | null;
    if (!member) throw new Error("Không tìm thấy hồ sơ thành viên.");
    const roles = (cur ?? []).map((r: { role: string }) => r.role);
    const wasAdmin = roles.includes("admin");

    await must(
      hasPerm(context, "members.edit", member.department),
      "Bạn không có quyền quản lý tài khoản của Ban này.",
    );
    await must(
      outranks(context, acct.member_id),
      "Chỉ được quản lý tài khoản của người có chức vụ thấp hơn bạn.",
    );
    if (member.department !== data.department || member.position !== data.position) {
      await must(
        hasPerm(context, "members.edit", member.department),
        "Bạn không có quyền đổi Ban hoặc chức vụ của thành viên này.",
      );
      await must(
        hasPerm(context, "members.edit", data.department),
        "Bạn không có quyền đổi Ban hoặc chức vụ của thành viên này.",
      );
      await must(
        canAssign(context, data.position),
        "Chỉ được gán chức vụ thấp hơn chức vụ của bạn.",
      );
    }

    if (data.isAdmin !== wasAdmin && !admin)
      throw new Error("Chỉ Quản trị viên được đổi cờ Quản trị viên.");

    const losesAdmin = wasAdmin && (!data.isAdmin || data.status !== "active");
    if (losesAdmin && data.userId === context.userId)
      throw new Error(
        "Bạn không thể tự hạ quyền hoặc khóa tài khoản Quản trị viên của chính mình.",
      );
    if (losesAdmin && (await adminCount(db)) <= 1)
      throw new Error("Hệ thống phải luôn còn ít nhất một Quản trị viên.");

    await db
      .from("members")
      .update({ department: data.department, position: data.position })
      .eq("id", acct.member_id);
    await db
      .from("member_accounts")
      .update({ account_status: data.status })
      .eq("user_id", data.userId);
    await db.auth.admin.updateUserById(data.userId, { ban_duration: ban(data.status) });
    if (data.isAdmin !== wasAdmin) await setAdminFlag(db, data.userId, data.isAdmin);
    return { ok: true };
  });

export const resetAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        mode: z.enum(["temp", "link"]),
        password: z.string().min(8).max(72).optional(),
        redirectTo: z.string().url().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await serviceDb();
    const { data: acct } = await db
      .from("member_accounts")
      .select("login_email, member_id, members(department)")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!acct) throw new Error("Không tìm thấy tài khoản.");
    const member = acct.members as { department: string } | null;
    if (!member) throw new Error("Không tìm thấy tài khoản.");
    await must(
      hasPerm(context, "members.edit", member.department),
      "Bạn không có quyền quản lý tài khoản của Ban này.",
    );
    await must(
      outranks(context, acct.member_id),
      "Chỉ được quản lý tài khoản của người có chức vụ thấp hơn bạn.",
    );
    if (data.mode === "temp") {
      if (!data.password) throw new Error("Cần nhập mật khẩu tạm thời.");
      const { error } = await db.auth.admin.updateUserById(data.userId, {
        password: data.password,
      });
      if (error) throw new Error(error.message);
      await db
        .from("member_accounts")
        .update({ must_change_password: true })
        .eq("user_id", data.userId);
    } else {
      const { error } = await db.auth.resetPasswordForEmail(
        acct.login_email,
        data.redirectTo ? { redirectTo: data.redirectTo } : {},
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await serviceDb();
    if (data.userId === context.userId)
      throw new Error("Bạn không thể tự xóa tài khoản của chính mình.");
    const [{ data: acct }, { data: cur }] = await Promise.all([
      db
        .from("member_accounts")
        .select("member_id, members(department)")
        .eq("user_id", data.userId)
        .maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", data.userId),
    ]);
    if (!acct) throw new Error("Không tìm thấy tài khoản.");
    const member = acct.members as { department: string } | null;
    if (!member) throw new Error("Không tìm thấy hồ sơ thành viên.");
    await must(
      hasPerm(context, "members.edit", member.department),
      "Bạn không có quyền quản lý tài khoản của Ban này.",
    );
    await must(
      outranks(context, acct.member_id),
      "Chỉ được quản lý tài khoản của người có chức vụ thấp hơn bạn.",
    );
    if (
      (cur ?? []).some((r: { role: string }) => r.role === "admin") &&
      (await adminCount(db)) <= 1
    )
      throw new Error("Hệ thống phải luôn còn ít nhất một Quản trị viên.");

    // 1. Xóa thông tin đăng nhập, quyền và liên kết tài khoản.
    await db.from("user_roles").delete().eq("user_id", data.userId);
    await db.from("member_accounts").delete().eq("user_id", data.userId);
    const { error } = await db.auth.admin.deleteUser(data.userId);
    if (error && !/not found/i.test(error.message)) throw new Error(error.message);

    // 2. Hồ sơ thành viên được giữ lại để lưu lịch sử, hệ thống tự chuyển sang "Đã rời".
    if (acct?.member_id) {
      const today = new Date().toISOString().slice(0, 10);
      const { error: mErr } = await db
        .from("members")
        .update({
          status: "left",
          left_on: today,
          status_note: "Tài khoản nội bộ đã bị xóa.",
          is_public: false,
        })
        .eq("id", acct.member_id);
      if (mErr)
        throw new Error(
          "Đã xóa tài khoản nhưng không cập nhật được hồ sơ thành viên: " + mErr.message,
        );
    }
    return { ok: true };
  });

/** Xóa hẳn hồ sơ thành viên chưa có tài khoản (hồ sơ mồ côi/rác). */
export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ memberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await serviceDb();
    const { data: member } = await db
      .from("members")
      .select("department")
      .eq("id", data.memberId)
      .maybeSingle();
    if (!member) throw new Error("Không tìm thấy hồ sơ thành viên.");
    await must(
      hasPerm(context, "members.edit", member.department),
      "Bạn không có quyền xóa hồ sơ thành viên Ban này.",
    );
    await must(
      outranks(context, data.memberId),
      "Chỉ được xóa hồ sơ của người có chức vụ thấp hơn bạn.",
    );
    const { data: linked } = await db
      .from("member_accounts")
      .select("user_id")
      .eq("member_id", data.memberId)
      .maybeSingle();
    if (linked)
      throw new Error(
        "Thành viên này đang có tài khoản đăng nhập. Hãy xóa tài khoản trước khi xóa hồ sơ.",
      );
    const { error } = await db.from("members").delete().eq("id", data.memberId);
    if (error) throw new Error("Không thể xóa hồ sơ thành viên: " + error.message);
    return { ok: true };
  });

export const approveApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        applicationId: z.string().uuid(),
        department: z.string().min(2).max(40),
        position: z.string().min(2).max(40),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await serviceDb();
    await must(
      hasPerm(context, "candidates.convert", data.department),
      "Bạn không có quyền kết nạp thành viên vào Ban này.",
    );
    await must(canAssign(context, data.position), "Chỉ được gán chức vụ thấp hơn chức vụ của bạn.");
    const { data: app } = await db
      .from("candidate_applications")
      .select("id, full_name, email, phone")
      .eq("id", data.applicationId)
      .single();
    if (!app) throw new Error("Không tìm thấy hồ sơ.");
    const { data: existing } = await db
      .from("members")
      .select("id, member_code")
      .eq("application_id", app.id)
      .maybeSingle();
    if (existing) return existing as { id: string; member_code: string };
    const { data: m, error } = await db
      .from("members")
      .insert({
        full_name: app.full_name,
        email: app.email,
        phone: app.phone,
        department: data.department,
        position: data.position,
        application_id: app.id,
      })
      .select("id, member_code")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.rpc("set_application_status", {
      _app: app.id,
      _status: "approved",
      _note: `Kết nạp thành viên ${(m as { member_code: string }).member_code}`,
    });
    return m as { id: string; member_code: string };
  });
