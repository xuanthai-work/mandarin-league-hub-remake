import type { Course, CourseStatus } from "./types";

export const COURSE_STATUSES: CourseStatus[] = ["Đang tuyển sinh", "Sắp khai giảng", "Đã đủ lớp", "Đã kết thúc"];

const NAMES = ["Nhập môn tiếng Trung", "Giao tiếp cơ bản", "Tiếng Trung sơ trung cấp", "Trung cấp & luyện thi", "Trung cao cấp", "Cao cấp & học thuật"];
const SESSIONS = [24, 24, 30, 36, 40, 48];
const STATUS: CourseStatus[] = ["Đang tuyển sinh", "Đang tuyển sinh", "Sắp khai giảng", "Sắp khai giảng", "Đã đủ lớp", "Sắp khai giảng"];

// DEMO data — teacher, fee and schedule are placeholders until TML publishes real classes.
export const COURSES: Course[] = NAMES.map((name, i) => {
  const level = i + 1;
  return {
    id: `hsk-${level}`,
    level,
    name,
    sessions: SESSIONS[i],
    duration: "90 phút/buổi",
    schedule: "Đang cập nhật",
    mode: "Online qua Zoom",
    fee: "Đang cập nhật",
    capacity: 20,
    status: STATUS[i],
    description: `Khóa HSK ${level} giúp học viên nắm vững từ vựng, ngữ pháp và kỹ năng nghe – nói – đọc – viết theo chuẩn HSK ${level}.`,
    syllabus: ["Phát âm & chữ Hán", "Từ vựng theo chủ đề", "Ngữ pháp trọng tâm", "Luyện nghe & nói", "Luyện đề HSK"],
    audience: level === 1 ? ["Người mới bắt đầu", "Học sinh, sinh viên yêu thích tiếng Trung"] : [`Đã hoàn thành HSK ${level - 1} hoặc tương đương`],
    outcomes: [`Sẵn sàng thi HSK ${level}`, "Tự tin giao tiếp theo trình độ", "Phương pháp tự học hiệu quả"],
    faq: [
      { q: "Học online như thế nào?", a: "Lớp học trực tiếp qua Zoom, có tài liệu và bài tập sau mỗi buổi." },
      { q: "Có cần thanh toán online không?", a: "Hiện chưa. TML sẽ liên hệ hướng dẫn sau khi bạn đăng ký." },
    ],
    demo: true,
  };
});

export const getCourses = () => COURSES;
export const getCourse = (id: string) => COURSES.find((c) => c.id === id);
