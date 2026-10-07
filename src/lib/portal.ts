import { supabase } from "@/integrations/supabase/client";

type Me = { roles: string[]; account: { account_status: string; must_change_password: boolean } | null };

export async function routeAfterLogin(): Promise<"/admin" | "/member/dashboard" | "/change-password" | "blocked" | "none"> {
  await supabase.rpc("record_login");
  const { data } = await supabase.rpc("my_account");
  const me = data as unknown as Me;
  const isAdmin = me.roles.includes("admin");
  if (me.account && me.account.account_status !== "active") return "blocked";
  if (!me.account && !isAdmin) return "none";
  if (me.account?.must_change_password) return "/change-password";
  if (isAdmin || me.roles.includes("department_head") || me.roles.includes("deputy_head")) return "/admin";
  return "/member/dashboard";
}

