import type { DictKey } from "@/lib/i18n/dict";
import type { HomeSectionKey } from "@/lib/site-content";

export type NavChild = {
  to:
    | "/about"
    | "/community"
    | "/partners"
    | "/courses/hsk"
    | "/courses"
    | "/activities"
    | "/news"
    | "/verify/hsk"
    | "/verify/certificate"
    | "/verify";
  dict: DictKey;
};

export type NavPage = "/" | "/organization" | "/teachers" | "/contact";

export type LandingNavItem = {
  /** id of the landing `<section>` this link scrolls to. */
  id: string;
  label: string;
  dict: DictKey;
  /** When set, the item only shows while that home section is enabled in the CMS. */
  show?: HomeSectionKey;
  /** Independent pages reachable directly from this header item. */
  children?: NavChild[];
  /** Standalone page this item opens when the visitor is not on the landing page. */
  page?: NavPage;
};

export const LANDING_NAV: LandingNavItem[] = [
  { id: "hero", label: "Trang chủ", dict: "nav./", page: "/" },
  {
    id: "about",
    label: "Giới thiệu",
    dict: "nav./about",
    show: "about",
    children: [
      { to: "/about", dict: "nav.child.about" },
      { to: "/community", dict: "nav.child.community" },
      { to: "/partners", dict: "nav.child.partners" },
    ],
  },
  {
    id: "organization",
    label: "Cơ cấu tổ chức",
    dict: "nav./organization",
    page: "/organization",
  },
  {
    id: "courses",
    label: "Khóa học",
    dict: "nav./courses",
    show: "courses",
    children: [
      { to: "/courses/hsk", dict: "nav.child.hsk" },
      { to: "/courses", dict: "nav.child.courses" },
    ],
  },
  { id: "teachers", label: "Giảng viên", dict: "nav./teachers", page: "/teachers" },
  {
    id: "activities",
    label: "Hoạt động & Tin tức",
    dict: "nav.activitiesAndNews",
    show: "activities",
    children: [
      { to: "/activities", dict: "nav.child.activities" },
      { to: "/news", dict: "nav.child.news" },
    ],
  },
  {
    id: "verify",
    label: "Xác minh",
    dict: "nav./verify",
    children: [
      { to: "/verify/hsk", dict: "nav.child.verifyHsk" },
      { to: "/verify/certificate", dict: "nav.child.verifyCert" },
      { to: "/verify", dict: "nav.child.verifyCenter" },
    ],
  },
  { id: "contact", label: "Liên hệ", dict: "nav./contact", show: "cta", page: "/contact" },
];

export const CONTACT = {
  email: "community@themandarinleague.bond",
  facebook: "https://www.facebook.com/themandarinleague/",
  instagram: "https://www.instagram.com/liendoanhanngu?stkn=MXJzbXhkY3kyNDc2aw==",
};
