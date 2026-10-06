import type { Partner, PartnerCategory } from "./types";

export const PARTNER_CATEGORIES: PartnerCategory[] = ["Giáo dục", "Công nghệ", "Cộng đồng", "Truyền thông", "Doanh nghiệp", "Tổ chức xã hội"];

// Intentionally empty — real partners are added by TML only.
export const PARTNERS: Partner[] = [];

export const getPartners = () => PARTNERS;
