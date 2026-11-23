import {
  SITE_DEFAULTS,
  type HomeContent,
  type HomeSectionKey,
  type SiteSettings,
} from "@/lib/site-content";

/**
 * Cấu trúc nội dung trang chủ theo đúng 3 tầng:
 *
 *   Section  →  khu vực trên trang chủ (8 mục + khối phụ trợ)
 *   ContentBlock → thành phần nằm BÊN TRONG một Section (sửa cùng trang với Section)
 *   NavPage  →  trang điều hướng riêng, chỉ mở khi khách bấm CTA (quản lý tách riêng)
 *
 * Content block không bao giờ là trang và không bao giờ xuất hiện như mục con ở sidebar.
 */

/** text = 1 dòng, area = nhiều dòng, link = "/đường-dẫn" hoặc http(s), url = chỉ http(s), email */
export type FieldKind = "text" | "area" | "link" | "url" | "email";
export type HomeTextKey = Exclude<keyof HomeContent, "show" | `${string}_en` | `${string}_zh`>;
export type SiteKey = Exclude<keyof SiteSettings, `${string}_en` | `${string}_zh`>;

export type ContentField<K extends string> = {
  key: K;
  label: string;
  kind: FieldKind;
  /** Chữ khách thấy khi ô để trống. "" nghĩa là để trống thì mục đó bị ẩn. */
  fallback: string;
  max: number;
  /** Gợi ý ngắn dưới ô nhập. */
  help?: string;
  /** Trường thuộc nhóm “Nút CTA” của khối. */
  group?: "cta";
  /** Khi là liên kết CTA: trang điều hướng mà nút này phải trỏ tới. */
  navPage?: string;
};

export type ManageRoute =
  | "/admin/photos"
  | "/admin/courses"
  | "/admin/teachers"
  | "/admin/activities"
  | "/admin/news"
  | "/admin/partners"
  | "/admin/certificates"
  | "/admin/hsk"
  | "/admin/departments";

export type ContentBlock<K extends string> = {
  id: string;
  label: string;
  /** Section chứa khối này. */
  sectionId: string;
  /** Khối có công tắc ẩn/hiện (khóa trong HomeContent.show) */
  toggle?: HomeSectionKey;
  /** Khối luôn hiện, không tắt được */
  always?: boolean;
  /** Khối tự hiện theo dữ liệu nơi khác, không có công tắc */
  auto?: boolean;
  /** Khối lấy dữ liệu từ module khác */
  manage?: { label: string; to: ManageRoute };
  fields: ContentField<K>[];
};

export type HomeSection = {
  id: string;
  label: string;
  toggle?: HomeSectionKey;
  /** Section luôn hiện, không tắt được */
  always?: boolean;
  /** Section tự hiện theo dữ liệu nơi khác */
  auto?: boolean;
  /** Khối nằm ngoài 8 mục chính của trang chủ (nhóm phụ trợ). */
  auxiliary?: boolean;
};

export type NavRoute =
  | "/about"
  | "/community"
  | "/organization"
  | "/courses"
  | "/courses/hsk"
  | "/teachers"
  | "/activities"
  | "/news"
  | "/partners"
  | "/verify/certificate"
  | "/verify/hsk"
  | "/join"
  | "/contact";

export type NavPage<K extends string> = {
  id: string;
  label: string;
  /** Route công khai của trang điều hướng. */
  to: NavRoute;
  /** Section có CTA dẫn tới trang này. */
  sectionId: string;
  fields: ContentField<K>[];
};

const T = 300; // ô 1 dòng
const A = 1000; // ô nhiều dòng

const text = (
  key: HomeTextKey,
  label: string,
  fallback = "",
  max = T,
): ContentField<HomeTextKey> => ({
  key,
  label,
  kind: "text",
  fallback,
  max,
});
const area = (
  key: HomeTextKey,
  label: string,
  fallback = "",
  max = A,
): ContentField<HomeTextKey> => ({
  key,
  label,
  kind: "area",
  fallback,
  max,
});
const link = (
  key: HomeTextKey,
  label: string,
  fallback: string,
  navPage?: string,
): ContentField<HomeTextKey> => ({
  key,
  label,
  kind: "link",
  fallback,
  max: T,
  group: "cta",
  ...(navPage ? { navPage } : {}),
});
const ctaLabel = (
  key: HomeTextKey,
  fallback: string,
  label = "Chữ trên nút",
): ContentField<HomeTextKey> => ({
  key,
  label,
  kind: "text",
  fallback,
  max: 80,
  group: "cta",
});

/** 8 section chính trên trang chủ + khối phụ trợ (đúng thứ tự hiển thị). */
export const HOME_SECTIONS: HomeSection[] = [
  {
    id: "hero",
    label: "Banner đầu trang",
    always: true,
  },
  {
    id: "about",
    label: "Giới thiệu",
    toggle: "about",
  },
  {
    id: "organization",
    label: "Cơ cấu tổ chức",
    always: true,
  },
  {
    id: "courses",
    label: "Khóa học HSK",
    toggle: "courses",
  },
  {
    id: "faculty",
    label: "Đội ngũ giảng viên",
    auto: true,
  },
  {
    id: "activities",
    label: "Hoạt động tiêu biểu",
    toggle: "activities",
  },
  {
    id: "partners",
    label: "Đối tác đồng hành",
    always: true,
  },
  {
    id: "verify",
    label: "Trung tâm xác minh",
    always: true,
  },
  {
    id: "cta",
    label: "Kêu gọi tham gia & Liên hệ",
    toggle: "cta",
    auxiliary: true,
  },
];

export const HOME_BLOCKS: ContentBlock<HomeTextKey>[] = [
  {
    id: "hero",
    label: "Banner",
    sectionId: "hero",
    always: true,
    fields: [
      text("hero_badge", "Dòng nhỏ phía trên", "Online Chinese Learning Community"),
      text("hero_title", "Tiêu đề lớn", "The Mandarin League"),
      area(
        "hero_lead",
        "Lời dẫn",
        "Cộng đồng học tiếng Trung trực tuyến dành cho người Việt – nơi học HSK bài bản, giao lưu văn hóa và cùng nhau phát triển.",
      ),
      ctaLabel("btn1_label", "Tham gia TML", "Chữ nút chính"),
      link("btn1_url", "Trang mở nút chính", "/join", "join-page"),
      ctaLabel("btn2_label", "Xem khóa học HSK", "Chữ nút phụ"),
      link("btn2_url", "Trang mở nút phụ", "/courses/hsk", "hsk-page"),
    ],
  },
  {
    id: "about",
    label: "Về TML",
    sectionId: "about",
    always: true,
    fields: [
      text("about_title", "Tiêu đề", "Học tiếng Trung cùng một cộng đồng thực thụ"),
      area(
        "about_p1",
        "Đoạn văn 1",
        "The Mandarin League (TML) là tổ chức cộng đồng phi lợi nhuận, quy tụ các bạn trẻ yêu thích tiếng Trung và văn hóa Trung Hoa, hoạt động hoàn toàn trực tuyến.",
      ),
      area(
        "about_p2",
        "Đoạn văn 2",
        "Chúng tôi tổ chức khóa học HSK, workshop, cuộc thi và các dự án sáng tạo nội dung, giúp mỗi thành viên vừa học vừa trải nghiệm.",
      ),
      text("stat1_value", "Số liệu 1 – con số", "HSK 1–6", 40),
      text("stat1_label", "Số liệu 1 – chú thích", "Lộ trình học bài bản", 80),
      text("stat2_value", "Số liệu 2 – con số", "8 Ban", 40),
      text("stat2_label", "Số liệu 2 – chú thích", "Chuyên môn hoạt động", 80),
      text("stat3_value", "Số liệu 3 – con số", "Hàng tháng", 40),
      text("stat3_label", "Số liệu 3 – chú thích", "Workshop & sự kiện", 80),
      ctaLabel("about_cta_label", "Tìm hiểu thêm"),
      link("about_cta_url", "Mở trang", "/about", "about-page"),
    ],
  },
  {
    id: "values",
    label: "Giá trị cốt lõi",
    sectionId: "about",
    always: true,
    fields: [
      text("values_title", "Tiêu đề khối", "Giá trị cốt lõi"),
      area("values_lead", "Lời dẫn"),
      text("value1_title", "Giá trị 1 – tên", "Học tập", 80),
      text("value1_desc", "Giá trị 1 – mô tả", "Học bài bản, thực chất."),
      text("value2_title", "Giá trị 2 – tên", "Cộng đồng", 80),
      text("value2_desc", "Giá trị 2 – mô tả", "Cùng nhau tiến bộ."),
      text("value3_title", "Giá trị 3 – tên", "Sáng tạo", 80),
      text("value3_desc", "Giá trị 3 – mô tả", "Đổi mới cách học."),
      text("value4_title", "Giá trị 4 – tên", "Trách nhiệm", 80),
      text("value4_desc", "Giá trị 4 – mô tả", "Minh bạch, tận tâm."),
    ],
  },
  {
    id: "community",
    label: "Cộng đồng TML",
    sectionId: "about",
    always: true,
    fields: [
      text("community_title", "Tiêu đề", "Những con người cùng tạo nên TML"),
      area(
        "community_desc",
        "Mô tả",
        "Thành viên, giảng viên, tình nguyện viên, mentor và đại sứ cùng làm nên cộng đồng TML.",
      ),
      ctaLabel("community_cta_label", "Khám phá cộng đồng"),
      link("community_cta_url", "Mở trang", "/community", "community-page"),
    ],
  },
  {
    id: "organization",
    label: "Sơ đồ tổ chức",
    sectionId: "organization",
    always: true,
    manage: { label: "Cơ cấu & Ban", to: "/admin/departments" },
    fields: [
      text("organization_title", "Tiêu đề", "Sơ đồ tổ chức TML"),
      area(
        "organization_desc",
        "Mô tả",
        "The Mandarin League vận hành bởi Ban Điều hành và 8 Ban chuyên môn.",
      ),
      ctaLabel("organization_cta_label", "Trang cơ cấu tổ chức"),
      link("organization_cta_url", "Mở trang", "/organization", "organization-page"),
    ],
  },
  {
    id: "courses",
    label: "Khóa học HSK 1–6",
    sectionId: "courses",
    toggle: "courses",
    manage: { label: "Khóa học", to: "/admin/courses" },
    fields: [
      text("courses_title", "Tiêu đề khối", "Chọn cấp độ phù hợp với bạn"),
      area("courses_lead", "Lời dẫn"),
      ctaLabel("courses_cta_label", "Tất cả các khóa học"),
      link("courses_cta_url", "Mở trang", "/courses", "courses-page"),
    ],
  },
  {
    id: "faculty-section",
    label: "Giới thiệu đội ngũ giảng viên",
    sectionId: "faculty",
    always: true,
    manage: { label: "Giáo viên", to: "/admin/teachers" },
    fields: [
      text("teachers_section_title", "Tiêu đề khối", "ĐỘI NGŨ GIẢNG VIÊN"),
      area(
        "teachers_section_desc",
        "Lời dẫn",
        "Đội ngũ giáo viên đồng hành cùng người học trên hành trình chinh phục tiếng Trung, phát triển năng lực ngôn ngữ và mở rộng cơ hội học tập.",
      ),
      ctaLabel("teachers_cta_label", "Xem tất cả các giảng viên"),
      link("teachers_cta_url", "Mở trang", "/teachers", "teachers-page"),
    ],
  },
  {
    id: "activities",
    label: "Học tập qua trải nghiệm",
    sectionId: "activities",
    toggle: "activities",
    manage: { label: "Hoạt động", to: "/admin/activities" },
    fields: [
      text("activities_title", "Tiêu đề khối", "Học qua trải nghiệm"),
      area("activities_lead", "Lời dẫn"),
      ctaLabel("activities_cta_label", "Xem tất cả"),
      link("activities_cta_url", "Mở trang", "/activities", "activities-page"),
    ],
  },
  {
    id: "carousel",
    label: "Hình ảnh hoạt động",
    sectionId: "activities",
    toggle: "carousel",
    manage: { label: "Hình ảnh", to: "/admin/photos" },
    fields: [],
  },
  {
    id: "news",
    label: "Bản tin & Kiến thức",
    sectionId: "activities",
    manage: { label: "Tin tức", to: "/admin/news" },
    fields: [
      text("news_section_title", "Tiêu đề khối", "Tin tức & kiến thức HSK"),
      area("news_section_desc", "Mô tả", "Nội dung chính thức do The Mandarin League biên soạn."),
      ctaLabel("news_cta_label", "Xem tất cả tin tức"),
      link("news_cta_url", "Mở trang", "/news", "news-page"),
    ],
  },
  {
    id: "partners-section",
    label: "Danh sách đối tác",
    sectionId: "partners",
    always: true,
    manage: { label: "Đối tác", to: "/admin/partners" },
    fields: [
      text("partners_section_title", "Tiêu đề khối", "Cùng TML mở rộng cơ hội học tập"),
      area("partners_section_desc", "Lời dẫn"),
      ctaLabel("partners_cta_label", "Xem tất cả đối tác"),
      link("partners_cta_url", "Mở trang", "/partners", "partners-page"),
    ],
  },
  {
    id: "verify",
    label: "Trung tâm xác minh",
    sectionId: "verify",
    always: true,
    fields: [
      text("verify_page_title", "Tiêu đề khối", "Tra cứu chứng nhận & điểm HSK"),
      area(
        "verify_page_desc",
        "Mô tả khối",
        "Kiểm tra tính xác thực của chứng nhận và kết quả được ghi nhận trong hệ thống của The Mandarin League.",
      ),
    ],
  },
  {
    id: "verify-certificate",
    label: "Xác minh chứng nhận",
    sectionId: "verify",
    always: true,
    manage: { label: "Chứng nhận", to: "/admin/certificates" },
    fields: [
      text("verify_cert_card_title", "Tiêu đề thẻ", "Xác minh chứng nhận"),
      area(
        "verify_cert_card_desc",
        "Mô tả thẻ",
        "Kiểm tra tính xác thực của chứng nhận do The Mandarin League phát hành hoặc ghi nhận.",
      ),
      ctaLabel("verify_cert_cta_label", "Xác minh chứng nhận"),
      link("verify_cert_cta_url", "Mở trang", "/verify/certificate", "verify-certificate-page"),
    ],
  },
  {
    id: "verify-hsk",
    label: "Xác minh kết quả HSK",
    sectionId: "verify",
    always: true,
    manage: { label: "Kết quả HSK", to: "/admin/hsk" },
    fields: [
      text("verify_hsk_card_title", "Tiêu đề thẻ", "Xác minh kết quả HSK"),
      area(
        "verify_hsk_card_desc",
        "Mô tả thẻ",
        "Kiểm tra kết quả HSK được TML ghi nhận hoặc xác minh trong hệ thống.",
      ),
      ctaLabel("verify_hsk_cta_label", "Xác minh kết quả HSK"),
      link("verify_hsk_cta_url", "Mở trang", "/verify/hsk", "verify-hsk-page"),
    ],
  },
  {
    id: "cta",
    label: "Kêu gọi tham gia & Liên hệ",
    sectionId: "cta",
    toggle: "cta",
    fields: [
      text("cta_title", "Tiêu đề", "Sẵn sàng trở thành một phần của TML?"),
      area(
        "cta_body",
        "Lời dẫn",
        "Ứng tuyển vào một trong 8 Ban, học hỏi kỹ năng mới và cùng lan tỏa tình yêu tiếng Trung.",
      ),
      ctaLabel("cta_button_label", "Tham gia TML"),
      link("cta_button_url", "Mở trang", "/join", "join-page"),
    ],
  },
];

/** Trang điều hướng riêng — chỉ mở khi khách bấm CTA, quản lý tách khỏi Section. */
export const NAV_PAGES: NavPage<HomeTextKey>[] = [
  {
    id: "about-page",
    label: "Về TML",
    to: "/about",
    sectionId: "about",
    fields: [
      text("about_page_title", "Tiêu đề trang", "The Mandarin League"),
      area(
        "about_page_desc",
        "Mô tả trang",
        "Liên Đoàn Hán Ngữ · 普通话联盟 — Online Chinese Learning Community.",
      ),
      text("about_page_intro_label", "01 · Nhãn phần giới thiệu", "01 · TML là gì?"),
      text(
        "about_page_intro_title",
        "Tiêu đề phần giới thiệu",
        "Cộng đồng giáo dục tiếng Trung trực tuyến",
      ),
      area(
        "about_page_intro_body",
        "Nội dung phần giới thiệu",
        "TML là tổ chức cộng đồng dành cho thanh niên yêu tiếng Trung và văn hóa Trung Hoa, kết nối người học, giáo viên và cơ hội giữa Việt Nam và Trung Quốc.",
      ),
      text("about_page_mission_label", "02 · Nhãn sứ mệnh", "02 · Sứ mệnh"),
      area(
        "about_page_mission",
        "Sứ mệnh",
        "Giúp người Việt học tiếng Trung hiệu quả, dễ tiếp cận và giàu trải nghiệm.",
      ),
      text("about_page_vision_label", "03 · Nhãn tầm nhìn", "03 · Tầm nhìn"),
      area(
        "about_page_vision",
        "Tầm nhìn",
        "Trở thành cộng đồng học tiếng Trung trực tuyến uy tín, cầu nối giáo dục Việt – Trung.",
      ),
      text("about_page_values_title", "Tiêu đề giá trị cốt lõi", "Điều chúng tôi theo đuổi"),
      text("about_page_steps_title", "Tiêu đề cách hoạt động", "TML hoạt động như thế nào?"),
      text("about_page_programs_title", "Tiêu đề chương trình", "Các chương trình chính"),
    ],
  },
  {
    id: "community-page",
    label: "Cộng đồng TML",
    to: "/community",
    sectionId: "about",
    fields: [
      text("community_page_eyebrow", "Nhãn trên tiêu đề", "Cộng đồng"),
      text("community_page_title", "Tiêu đề trang", "Những con người của TML"),
      area(
        "community_page_desc",
        "Mô tả trang",
        "Cộng đồng học tập chính thức — nơi mỗi người cùng học, cùng đóng góp.",
      ),
      text(
        "community_opportunities_title",
        "Tiêu đề cơ hội cộng đồng",
        "Cơ hội dành cho cộng đồng",
      ),
    ],
  },
  {
    id: "organization-page",
    label: "Chi tiết cơ cấu tổ chức",
    to: "/organization",
    sectionId: "organization",
    fields: [
      text("organization_page_title", "Tiêu đề trang", "Sơ đồ tổ chức TML"),
      area(
        "organization_page_desc",
        "Mô tả trang",
        "The Mandarin League vận hành bởi Ban Điều hành và 8 Ban chuyên môn.",
      ),
    ],
  },
  {
    id: "hsk-page",
    label: "Khóa học HSK 1–6",
    to: "/courses/hsk",
    sectionId: "courses",
    fields: [
      text("hsk_page_title", "Tiêu đề trang", "Lộ trình HSK 1–6"),
      area(
        "hsk_page_desc",
        "Mô tả trang",
        "Học trực tuyến, lộ trình rõ ràng từ nhập môn đến cao cấp.",
      ),
    ],
  },
  {
    id: "courses-page",
    label: "Tất cả khóa học",
    to: "/courses",
    sectionId: "courses",
    fields: [
      text("courses_page_title", "Tiêu đề trang", "Học tiếng Trung cùng The Mandarin League"),
      area(
        "courses_page_desc",
        "Mô tả trang",
        "Các lớp HSK 1–6 theo lộ trình và những chương trình học cộng đồng, chuyên đề — học trực tuyến.",
      ),
    ],
  },
  {
    id: "teachers-page",
    label: "Tất cả giảng viên",
    to: "/teachers",
    sectionId: "faculty",
    fields: [
      text("teachers_page_title", "Tiêu đề trang", "Đội ngũ Giảng viên"),
      area(
        "teachers_page_desc",
        "Mô tả trang",
        "Đội ngũ giáo viên đồng hành cùng người học trên hành trình chinh phục tiếng Trung, phát triển năng lực ngôn ngữ và mở rộng cơ hội học tập.",
      ),
    ],
  },
  {
    id: "activities-page",
    label: "Tất cả hoạt động",
    to: "/activities",
    sectionId: "activities",
    fields: [
      text("activities_page_title", "Tiêu đề trang", "Học qua trải nghiệm"),
      area("activities_page_desc", "Mô tả trang", "Các chương trình chính thức do TML tổ chức."),
    ],
  },
  {
    id: "news-page",
    label: "Tất cả tin tức",
    to: "/news",
    sectionId: "activities",
    fields: [
      text("news_page_title", "Tiêu đề trang", "Tin tức & kiến thức"),
      area(
        "news_page_desc",
        "Mô tả trang",
        "Nội dung chính thức do The Mandarin League biên soạn.",
      ),
    ],
  },
  {
    id: "partners-page",
    label: "Tất cả đối tác",
    to: "/partners",
    sectionId: "partners",
    fields: [
      text("partners_page_title", "Tiêu đề trang", "Đồng hành cùng TML"),
      area(
        "partners_page_desc",
        "Mô tả trang",
        "Cùng kiến tạo cơ hội học tập và kết nối Việt Nam – Trung Quốc.",
      ),
    ],
  },
  {
    id: "verify-certificate-page",
    label: "Xác minh chứng nhận",
    to: "/verify/certificate",
    sectionId: "verify",
    fields: [
      text("verify_certificate_title", "Tiêu đề trang", "Xác minh chứng nhận"),
      area(
        "verify_certificate_desc",
        "Mô tả trang",
        "Nhập mã chứng nhận để kiểm tra trạng thái và thông tin do The Mandarin League phát hành hoặc ghi nhận.",
      ),
    ],
  },
  {
    id: "verify-hsk-page",
    label: "Xác minh kết quả HSK",
    to: "/verify/hsk",
    sectionId: "verify",
    fields: [
      text("verify_hsk_title", "Tiêu đề trang", "Xác minh kết quả HSK"),
      area(
        "verify_hsk_desc",
        "Mô tả trang",
        "Nhập mã xác minh hoặc quét mã QR để kiểm tra thông tin kết quả HSK được ghi nhận trong hệ thống TML.",
      ),
    ],
  },
  {
    id: "join-page",
    label: "Tham gia TML",
    to: "/join",
    sectionId: "cta",
    fields: [
      text("join_page_title", "Tiêu đề trang", "Tại sao tham gia TML?"),
      area(
        "join_page_desc",
        "Mô tả trang",
        "Vừa học tiếng Trung, vừa rèn kỹ năng và đóng góp cho cộng đồng.",
      ),
    ],
  },
  {
    id: "contact-page",
    label: "Liên hệ",
    to: "/contact",
    sectionId: "cta",
    fields: [
      text("contact_page_title", "Tiêu đề trang", "Kết nối với TML"),
      area("contact_page_desc", "Mô tả trang", "Chúng tôi luôn sẵn lòng lắng nghe."),
    ],
  },
];

/**
 * Đích đến cho nút CTA, hiển thị bằng TÊN TRANG thay vì đường dẫn kỹ thuật.
 * Người quản lý nội dung không cần biết “/about” là gì — chọn “Về TML” là đủ.
 */
export type ContentDestination = { value: string; label: string; group: string };

export const CONTENT_DESTINATIONS: ContentDestination[] = [
  { value: "/", label: "Trang chủ", group: "" },
  ...NAV_PAGES.map((page) => ({
    value: page.to,
    label: page.label,
    group: HOME_SECTIONS.find((section) => section.id === page.sectionId)?.label ?? "",
  })),
];

/** Tên trang hiển thị cho một đường dẫn (nếu có trong danh sách đích đến). */
export function destinationLabel(value: string): string | undefined {
  return CONTENT_DESTINATIONS.find((destination) => destination.value === value)?.label;
}

export const SITE_BLOCKS: ContentBlock<SiteKey>[] = [
  {
    id: "contact",
    label: "Liên hệ & Mạng xã hội",
    sectionId: "site",
    fields: [
      {
        key: "email",
        label: "Email liên hệ",
        kind: "email",
        fallback: SITE_DEFAULTS.email,
        max: T,
      },
      {
        key: "facebook",
        label: "Facebook",
        kind: "url",
        fallback: SITE_DEFAULTS.facebook,
        max: T,
      },
      {
        key: "instagram",
        label: "Instagram",
        kind: "url",
        fallback: SITE_DEFAULTS.instagram,
        max: T,
      },
      { key: "threads", label: "Threads", kind: "url", fallback: "", max: T },
      { key: "tiktok", label: "TikTok", kind: "url", fallback: "", max: T },
      { key: "linkedin", label: "LinkedIn", kind: "url", fallback: "", max: T },
    ],
  },
  {
    id: "footer",
    label: "Chân trang",
    sectionId: "site",
    fields: [
      {
        key: "tagline",
        label: "Mô tả ngắn về TML",
        kind: "area",
        fallback: SITE_DEFAULTS.tagline,
        max: A,
      },
      {
        key: "footer_note",
        label: "Dòng bản quyền",
        kind: "text",
        fallback: SITE_DEFAULTS.footer_note,
        max: T,
      },
    ],
  },
];

export function blocksOfSection(sectionId: string): ContentBlock<HomeTextKey>[] {
  return HOME_BLOCKS.filter((block) => block.sectionId === sectionId);
}

export function navPagesOfSection(sectionId: string): NavPage<HomeTextKey>[] {
  return NAV_PAGES.filter((page) => page.sectionId === sectionId);
}

export function findNavPage(id: string | undefined): NavPage<HomeTextKey> | undefined {
  return id ? NAV_PAGES.find((page) => page.id === id) : undefined;
}

export function findBlock(id: string | undefined): ContentBlock<HomeTextKey> | undefined {
  return id ? HOME_BLOCKS.find((block) => block.id === id) : undefined;
}

/** Các khóa text có thể chỉnh theo ngôn ngữ của một khối. */
export function isLocalizedField(field: ContentField<string>): boolean {
  return field.kind === "text" || field.kind === "area";
}
