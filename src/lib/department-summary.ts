import { DEPARTMENTS } from "@/lib/data/departments";

export type DeptMember = {
  id: string;
  member_code: string;
  full_name: string;
  department: string;
  position: string;
  status: string; // "active" | "on_leave" | "left"
  /** Storage path in the private `avatars` bucket; signed on read. */
  avatar_path?: string | null;
};
export type DeptChannel = {
  department: string;
  zalo_url: string;
  resources_url: string;
  note: string;
  updated_at: string;
};
export type DeptAdvisor = {
  id: string;
  department: string;
  member_id: string;
  specialty_area: string;
  display_order: number;
  is_active: boolean;
};
export type DeptWarning = "no_head" | "no_zalo" | "advisor_empty";

export type DeptSummary = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  head: DeptMember | null;
  deputies: DeptMember[];
  activeCount: number;
  onLeaveCount: number;
  channel: DeptChannel | null;
  advisorsEnabled: boolean;
  advisorCount: number;
  warnings: DeptWarning[];
};

export const WARNING_LABEL: Record<DeptWarning, string> = {
  no_head: "Chưa có Trưởng Ban",
  no_zalo: "Chưa có nhóm Zalo",
  advisor_empty: "Đã bật cố vấn nhưng chưa bổ nhiệm",
};

const byCode = (a: DeptMember, b: DeptMember) => a.member_code.localeCompare(b.member_code);

export function summarizeDepartments(input: {
  members: DeptMember[];
  channels: DeptChannel[];
  advisorSettings: { department: string; enabled: boolean }[];
  advisors: DeptAdvisor[];
}): DeptSummary[] {
  return DEPARTMENTS.map((d) => {
    const inDept = input.members.filter((m) => m.department === d.id && m.status !== "left");
    const head = inDept.filter((m) => m.position === "Trưởng Ban").sort(byCode)[0] ?? null;
    const deputies = inDept.filter((m) => m.position === "Phó Ban").sort(byCode);
    const channel = input.channels.find((c) => c.department === d.id) ?? null;
    const advisorsEnabled =
      input.advisorSettings.find((s) => s.department === d.id)?.enabled ?? false;
    const advisorCount = input.advisors.filter((a) => a.department === d.id && a.is_active).length;

    const warnings: DeptWarning[] = [];
    if (!head) warnings.push("no_head");
    if (!channel?.zalo_url.trim()) warnings.push("no_zalo");
    if (advisorsEnabled && advisorCount === 0) warnings.push("advisor_empty");

    return {
      id: d.id,
      name: d.name,
      nameEn: d.nameEn,
      description: d.description,
      head,
      deputies,
      activeCount: inDept.filter((m) => m.status === "active").length,
      onLeaveCount: inDept.filter((m) => m.status === "on_leave").length,
      channel,
      advisorsEnabled,
      advisorCount,
      warnings,
    };
  });
}
