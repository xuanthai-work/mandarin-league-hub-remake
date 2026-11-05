import type { Course, CourseStatus } from "./types";

export const COURSE_STATUSES: CourseStatus[] = [
  "Đang tuyển sinh",
  "Sắp khai giảng",
  "Đã đủ lớp",
  "Đã kết thúc",
];

const NAMES = [
  "Nhập môn tiếng Trung",
  "Giao tiếp cơ bản",
  "Tiếng Trung sơ trung cấp",
  "Trung cấp & luyện thi",
  "Trung cao cấp",
  "Cao cấp & học thuật",
];
const SESSIONS = [24, 24, 30, 36, 40, 48];
const STATUS: CourseStatus[] = Array(6).fill("Sắp khai giảng");

// DEMO data — teacher, fee and schedule are placeholders until TML publishes real classes.
export const COURSES: Course[] = NAMES.map((name, i) => {
  const level = i + 1;
  return {
    id: `hsk-${level}`,
    level,
    name,
    sessions: SESSIONS[i] ?? 24,
    duration: "90 phút/buổi",
    schedule: "Đang cập nhật",
    mode: "Trực tuyến (Online)",
    fee: "Đang cập nhật",
    capacity: 20,
    status: STATUS[i] ?? "Sắp khai giảng",
    description: `Khóa HSK ${level} giúp học viên nắm vững từ vựng, ngữ pháp và kỹ năng nghe – nói – đọc – viết theo chuẩn HSK ${level}.`,
    syllabus: [
      "Phát âm & chữ Hán",
      "Từ vựng theo chủ đề",
      "Ngữ pháp trọng tâm",
      "Luyện nghe & nói",
      "Luyện đề HSK",
    ],
    audience:
      level === 1
        ? ["Người mới bắt đầu", "Học sinh, sinh viên yêu thích tiếng Trung"]
        : [`Đã hoàn thành HSK ${level - 1} hoặc tương đương`],
    outcomes: [
      `Sẵn sàng thi HSK ${level}`,
      "Tự tin giao tiếp theo trình độ",
      "Phương pháp tự học hiệu quả",
    ],
    faq: [
      {
        q: "Học online như thế nào?",
        a: "Lớp học trực tuyến; lịch và link học gửi trong nhóm Zalo lớp.",
      },
      {
        q: "Có cần thanh toán online không?",
        a: "Không. Đơn được xét duyệt; học viên trúng tuyển nhận hướng dẫn qua email.",
      },
    ],
    demo: false,
  };
});

export const getCourses = () => COURSES;
export const getCourse = (id: string) => COURSES.find((c) => c.id === id);
