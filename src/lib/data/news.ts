import type { NewsArticle, NewsCategory } from "./types";

export const NEWS_CATEGORIES: NewsCategory[] = [
  "Học tiếng Trung",
  "HSK",
  "Giáo dục",
  "AI",
  "Thanh niên",
  "Văn hóa Trung Hoa",
  "Hoạt động TML",
  "Cơ hội học tập",
];

// Official TML content only. DEMO articles for preview.
export const NEWS: NewsArticle[] = [
  {
    slug: "lo-trinh-hsk-cho-nguoi-moi",
    title: "Lộ trình học HSK cho người mới bắt đầu",
    category: "HSK",
    author: "Ban Chuyên môn – Giảng dạy",
    date: "06/10/2026",
    glyph: "路",
    summary: "Gợi ý các bước học từ HSK 1 đến HSK 3 một cách bài bản.",
    body: [
      "Bắt đầu với phát âm và pinyin, sau đó xây dựng vốn từ theo chủ đề.",
      "Mỗi cấp độ nên kết hợp luyện nghe, nói và làm đề mẫu.",
    ],
    demo: true,
  },
  {
    slug: "tet-trung-thu",
    title: "Tết Trung thu trong văn hóa Trung Hoa",
    category: "Văn hóa Trung Hoa",
    author: "Ban Biên dịch – Phiên dịch",
    date: "01/10/2026",
    glyph: "月",
    summary: "Nguồn gốc, phong tục và những từ vựng tiếng Trung gắn với Trung thu.",
    body: [
      "Trung thu (中秋节) là dịp đoàn viên quan trọng.",
      "Một số từ vựng: 月饼 bánh trung thu, 赏月 ngắm trăng.",
    ],
    demo: true,
  },
  {
    slug: "ai-ho-tro-hoc-ngoai-ngu",
    title: "AI hỗ trợ học ngoại ngữ như thế nào?",
    category: "AI",
    author: "Ban Công nghệ & Hệ thống",
    date: "25/09/2026",
    glyph: "智",
    summary: "Cách dùng công cụ AI một cách có trách nhiệm khi học tiếng Trung.",
    body: [
      "AI có thể giúp luyện hội thoại và kiểm tra câu.",
      "Hãy dùng AI như trợ lý, không thay thế việc tự học.",
    ],
    demo: true,
  },
];

export const getNews = () => NEWS;
export const getArticle = (slug: string) => NEWS.find((n) => n.slug === slug);
