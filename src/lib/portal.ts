import { supabase } from "@/integrations/supabase/client";
import { NO_PERMISSIONS, parseMyPermissions } from "@/lib/permission-catalog";

type Me = {
  roles: string[];
  account: { account_status: string; must_change_password: boolean } | null;
};

export async function routeAfterLogin(): Promise<
  "/admin" | "/change-password" | "blocked" | "none"
> {
  await supabase.rpc("record_login");
  const { data } = await supabase.rpc("my_account");
  const me = data as unknown as Me;
  const { data: permsData, error: permsError } = await supabase.rpc("my_permissions");
  const perms = permsError ? NO_PERMISSIONS : parseMyPermissions(permsData);
  const isAdmin = perms.isAdmin || me.roles.includes("admin");
  if (me.account && me.account.account_status !== "active") return "blocked";
  if (!me.account && !isAdmin) return "none";
  if (me.account?.must_change_password) return "/change-password";
  return "/admin";
}
