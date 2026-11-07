import { RECRUIT_DEPTS, positionsFor } from "@/lib/recruitment";

export { RECRUIT_DEPTS as ACCOUNT_DEPTS, positionsFor };

export type AccountStatus = "inactive" | "active" | "suspended" | "disabled";
export const ACCOUNT_STATUS: Record<AccountStatus, string> = {
  inactive: "Chưa kích hoạt",
  active: "Đang hoạt động",
  suspended: "Tạm khóa",
  disabled: "Vô hiệu hóa",
};
