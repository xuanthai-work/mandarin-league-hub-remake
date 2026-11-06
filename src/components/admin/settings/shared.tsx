import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MyAccount = {
  email: string;
  roles: string[];
  account: { login_email?: string; last_login_at?: string | null } | null;
  member: {
    full_name: string;
    member_code: string;
    avatar_path: string | null;
    department: string | null;
    position?: string | null;
    is_public?: boolean;
  } | null;
};

/** Same query key as the member dashboard, so both screens share one cache entry. */
export function useMyAccount() {
  return useQuery({
    queryKey: ["my-account"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_account");
      if (error) throw error;
      return data as unknown as MyAccount;
    },
  });
}

export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-20 rounded-2xl border border-border bg-card shadow-xs"
    >
      <div className="flex items-start gap-3 px-5 pt-5 sm:px-6">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="divide-y divide-border/70 px-5 pb-2 sm:px-6">{children}</div>
    </section>
  );
}

export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
