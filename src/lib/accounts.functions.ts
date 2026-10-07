import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const access = z.enum(["admin", "department_head", "deputy_head", "member"]);
const status = z.enum(["inactive", "active", "suspended", "disabled"]);
const perms = z.array(z.string().max(40)).max(30);

async function adminClient(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Chỉ Quản trị viên được thực hiện thao tác này.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const ban = (s: string) => (s === "active" ? "none" : "876000h");

async function setAccess(db: any, userId: string, level: string) {
  await db.from("user_roles").delete().eq("user_id", userId);
  const { error } = await db.from("user_roles").insert({ user_id: userId, role: level });
  if (error) throw new Error(error.message);
}

async function adminCount(db: any) {
  const { count } = await db.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
  return count ?? 0;
}

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminClient(context);
    const [{ data: accts }, { data: roles }, { data: users }] = await Promise.all([
      db.from("member_accounts").select("*, members(*)").order("created_at", { ascending: false }),
      db.from("user_roles").select("user_id, role"),
      db.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const lastSeen = new Map((users?.users ?? []).map((u: any) => [u.id, u.last_sign_in_at ?? null]));
    return (accts ?? []).map((a: any) => ({
      user_id: a.user_id as string,
      login_email: a.login_email as string,
      account_status: a.account_status as string,
      must_change_password: a.must_change_password as boolean,
      permissions: a.permissions as string[],
      created_at: a.created_at as string,
      last_login_at: (a.last_login_at ?? lastSeen.get(a.user_id) ?? null) as string | null,
      access: ((roles ?? []).find((r: any) => r.user_id === a.user_id)?.role ?? "member") as string,
      member: a.members as { id: string; member_code: string; full_name: string; department: string; position: string },
    }));
  });

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    memberId: z.string().uuid().optional(),
    newMember: z.object({ full_name: z.string().trim().min(2).max(120), phone: z.string().max(30).default("") }).optional(),
    email: z.string().trim().toLowerCase().email().max(200),
    password: z.string().min(8).max(72),
    department: z.string().min(2).max(40),
    position: z.string().min(2).max(40),
    access, permissions: perms, status, mustChange: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    let memberId = data.memberId;
    if (memberId) {
      const { data: linked } = await db.from("member_accounts").select("user_id").eq("member_id", memberId).maybeSingle();
      if (linked) throw new Error("Thành viên này đã có tài khoản nội bộ.");
      await db.from("members").update({ department: data.department, position: data.position, email: data.email }).eq("id", memberId);
    } else {
      if (!data.newMember) throw new Error("Cần chọn hoặc nhập thông tin thành viên.");
      const { data: m, error } = await db.from("members").insert({ ...data.newMember, email: data.email, department: data.department, position: data.position }).select("id").single();
      if (error) throw new Error(error.message);
      memberId = m.id;
    }
    const { data: created, error: authErr } = await db.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      ban_duration: ban(data.status),
    });
    if (authErr || !created.user) throw new Error(authErr?.message?.includes("already") ? "Email này đã có tài khoản." : authErr?.message ?? "Không tạo được tài khoản.");
    const uid = created.user.id;
    const { error: aErr } = await db.from("member_accounts").insert({
      user_id: uid, member_id: memberId, login_email: data.email, account_status: data.status,
      must_change_password: data.mustChange, permissions: data.permissions,
    });
    if (aErr) { await db.auth.admin.deleteUser(uid); throw new Error(aErr.message); }
    await setAccess(db, uid, data.access);
    return { ok: true };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(), department: z.string().min(2).max(40), position: z.string().min(2).max(40),
    access, permissions: perms, status,
  }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { data: cur } = await db.from("user_roles").select("role").eq("user_id", data.userId);
    const wasAdmin = (cur ?? []).some((r: any) => r.role === "admin");
    const losesAdmin = wasAdmin && (data.access !== "admin" || data.status !== "active");
    if (losesAdmin && data.userId === context.userId) throw new Error("Bạn không thể tự hạ quyền hoặc khóa tài khoản Quản trị viên của chính mình.");
    if (losesAdmin && (await adminCount(db)) <= 1) throw new Error("Hệ thống phải luôn còn ít nhất một Quản trị viên.");
    const { data: acct } = await db.from("member_accounts").select("member_id").eq("user_id", data.userId).single();
    await db.from("members").update({ department: data.department, position: data.position }).eq("id", acct!.member_id);
    await db.from("member_accounts").update({ account_status: data.status, permissions: data.permissions }).eq("user_id", data.userId);
    await db.auth.admin.updateUserById(data.userId, { ban_duration: ban(data.status) });
    await setAccess(db, data.userId, data.access);
    return { ok: true };
  });

export const resetAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    userId: z.string().uuid(), mode: z.enum(["temp", "link"]), password: z.string().min(8).max(72).optional(),
    redirectTo: z.string().url().max(300).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { data: acct } = await db.from("member_accounts").select("login_email").eq("user_id", data.userId).single();
    if (!acct) throw new Error("Không tìm thấy tài khoản.");
    if (data.mode === "temp") {
      if (!data.password) throw new Error("Cần nhập mật khẩu tạm thời.");
      const { error } = await db.auth.admin.updateUserById(data.userId, { password: data.password });
      if (error) throw new Error(error.message);
      await db.from("member_accounts").update({ must_change_password: true }).eq("user_id", data.userId);
    } else {
      const { error } = await db.auth.resetPasswordForEmail(acct.login_email, data.redirectTo ? { redirectTo: data.redirectTo } : {});
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const approveApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    applicationId: z.string().uuid(), department: z.string().min(2).max(40), position: z.string().min(2).max(40),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { data: app } = await db.from("candidate_applications").select("id, full_name, email, phone").eq("id", data.applicationId).single();
    if (!app) throw new Error("Không tìm thấy hồ sơ.");
    const { data: existing } = await db.from("members").select("id, member_code").eq("application_id", app.id).maybeSingle();
    if (existing) return existing as { id: string; member_code: string };
    const { data: m, error } = await db.from("members").insert({
      full_name: app.full_name, email: app.email, phone: app.phone,
      department: data.department, position: data.position, application_id: app.id,
    }).select("id, member_code").single();
    if (error) throw new Error(error.message);
    await context.supabase.rpc("set_application_status", { _app: app.id, _status: "approved", _note: `Kết nạp thành viên ${(m as { member_code: string }).member_code}` });
    return m as { id: string; member_code: string };
  });
