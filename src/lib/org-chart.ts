import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** One row of the definer `public_org_chart()` RPC (leaders and head-counts only). */
export type PublicOrgRow = {
  dept: string;
  role_title: string | null;
  display_name: string | null;
  member_count: number;
};

/** One row of the definer `public_dept_advisors()` RPC. */
export type PublicDeptAdvisor = {
  dept: string;
  display_name: string;
  specialty_area: string;
};

export function usePublicOrgChart() {
  return useQuery({
    queryKey: ["public-org"],
    queryFn: async () => ((await supabase.rpc("public_org_chart")).data ?? []) as PublicOrgRow[],
  });
}

export function usePublicAdvisors() {
  return useQuery({
    queryKey: ["public-advisors"],
    queryFn: async () =>
      ((await supabase.rpc("public_dept_advisors")).data ?? []) as PublicDeptAdvisor[],
  });
}

/** Leader of a department by position, e.g. "Trưởng Ban". */
export const orgLeader = (
  rows: PublicOrgRow[] | undefined,
  dept: string,
  role: string,
): string | undefined =>
  rows?.find((r) => r.dept === dept && r.role_title === role)?.display_name ?? undefined;

/** Active member count of a department. */
export const orgMemberCount = (rows: PublicOrgRow[] | undefined, dept: string): number =>
  rows?.find((r) => r.dept === dept)?.member_count ?? 0;

/** Professional advisors assigned to a department. */
export const advisorsOf = (
  rows: PublicDeptAdvisor[] | undefined,
  dept: string,
): PublicDeptAdvisor[] => (rows ?? []).filter((a) => a.dept === dept);

/** Two-letter initials used by the avatar placeholders. */
export const initials = (n?: string) =>
  n
    ? n
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "";
