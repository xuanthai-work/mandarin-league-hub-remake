import type { Department } from "./types";

// No real people are listed until TML provides them — UI shows "Đang cập nhật".
export const DEPARTMENTS: Department[] = [
  { id: "hr", name: "Ban Nhân sự", nameEn: "Human Resources", description: "Tuyển chọn, đào tạo và gắn kết thành viên.", members: [] },
  { id: "academic", name: "Ban Chuyên môn – Giảng dạy", nameEn: "Academic & Teaching", description: "Xây dựng chương trình HSK và tổ chức giảng dạy.", members: [] },
  { id: "comms", name: "Ban Truyền thông – Marketing", nameEn: "Communications & Marketing", description: "Lan tỏa hình ảnh và hoạt động của TML.", members: [] },
  { id: "design", name: "Ban Thiết kế", nameEn: "Design", description: "Thiết kế nhận diện, ấn phẩm và nội dung hình ảnh.", members: [] },
  { id: "translation", name: "Ban Biên dịch – Phiên dịch", nameEn: "Translation & Interpretation", description: "Biên dịch tài liệu và hỗ trợ giao lưu Việt – Trung.", members: [] },
  { id: "postcard", name: "Ban Postcard – Podcast", nameEn: "Postcard & Podcast", description: "Sản xuất postcard, podcast về tiếng Trung và văn hóa.", members: [] },
  { id: "finance", name: "Ban Tài chính – Đối ngoại", nameEn: "Finance & External Relations", description: "Quản lý tài chính và phát triển quan hệ đối tác.", members: [] },
  {
    id: "tech", name: "Ban Công nghệ & Hệ thống", nameEn: "Technology & Systems",
    description: "Vận hành website và các hệ thống số của TML.",
    responsibilities: ["Website", "Hệ thống tuyển thành viên", "Admin", "Database", "Email hệ thống", "Automation", "QR", "Verification", "Công nghệ giáo dục", "Hỗ trợ kỹ thuật"],
    members: [],
  },
];

export const getDepartments = () => DEPARTMENTS;
export const getDepartment = (id: string) => DEPARTMENTS.find((d) => d.id === id);
