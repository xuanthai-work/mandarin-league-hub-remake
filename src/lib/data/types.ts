// Shared domain types. Data modules return these so a Supabase data source can replace demo data later.
export type Person = {
  id: string;
  name: string;
  role: string;
  departmentId?: string;
  bio?: string;
  avatarUrl?: string;
};

export type Department = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  responsibilities?: string[];
  lead?: Person;
  deputy?: Person;
  members: Person[];
};

export type CourseStatus = "Đang tuyển sinh" | "Sắp khai giảng" | "Đã đủ lớp" | "Đã kết thúc";

export type Course = {
  id: string;
  level: number;
  name: string;
  teacher?: Person;
  sessions: number;
  duration: string;
  schedule: string;
  mode: string;
  fee: string;
  capacity: number;
  status: CourseStatus;
  description: string;
  syllabus: string[];
  audience: string[];
  outcomes: string[];
  faq: { q: string; a: string }[];
  demo: boolean;
};

export type ActivityType =
  | "Workshop" | "Cuộc thi" | "Webinar" | "Camp" | "Giao lưu Việt Nam – Trung Quốc"
  | "Hoạt động thanh niên" | "AIGC" | "Học bổng" | "Dự án cộng đồng" | "Tình nguyện";

export type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  date: string;
  mode: string;
  location: string;
  description: string;
  status: "Sắp diễn ra" | "Đang mở đăng ký" | "Đã kết thúc";
  glyph: string;
  demo: boolean;
};

export type NewsCategory =
  | "Học tiếng Trung" | "HSK" | "Giáo dục" | "AI" | "Thanh niên"
  | "Văn hóa Trung Hoa" | "Hoạt động TML" | "Cơ hội học tập";

export type NewsArticle = {
  slug: string;
  title: string;
  category: NewsCategory;
  author: string;
  date: string;
  summary: string;
  body: string[];
  glyph: string;
  demo: boolean;
};

export type PartnerCategory = "Giáo dục" | "Công nghệ" | "Cộng đồng" | "Truyền thông" | "Doanh nghiệp" | "Tổ chức xã hội";

export type Partner = {
  id: string;
  name: string;
  category: PartnerCategory;
  field: string;
  description: string;
  website?: string;
  logoUrl?: string;
};

export type Member = Person & {
  memberId: string;
  joinedAt: string;
  status: "Đang hoạt động" | "Tạm nghỉ" | "Cựu thành viên";
  activities: string[];
  achievements: string[];
};
