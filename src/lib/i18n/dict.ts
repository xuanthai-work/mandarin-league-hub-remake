type Entry = { vi: string; zh: string; en: string };

export const DICT = {
  "nav./": { vi: "Trang chủ", zh: "首页", en: "Home" },
  "nav./about": { vi: "Giới thiệu", zh: "关于我们", en: "About" },
  "nav./organization": { vi: "Cơ cấu tổ chức", zh: "组织架构", en: "Organization" },
  "nav./courses": { vi: "Khóa học", zh: "课程", en: "Courses" },
  "nav./teachers": { vi: "Giảng viên", zh: "师资", en: "Faculty" },
  "nav./activities": { vi: "Hoạt động", zh: "活动", en: "Activities" },
  "nav./verify": { vi: "Xác minh", zh: "证书查询", en: "Verify" },
  "nav./join": { vi: "Tuyển thành viên", zh: "招募成员", en: "Join us" },
  "nav./contact": { vi: "Liên hệ", zh: "联系我们", en: "Contact" },
  "nav./community": { vi: "Cộng đồng", zh: "社区", en: "Community" },
  "nav./partners": { vi: "Đối tác", zh: "合作伙伴", en: "Partners" },
  "nav./news": { vi: "Tin tức", zh: "新闻", en: "News" },
  "cta.join": { vi: "Tham gia TML", zh: "加入 TML", en: "Join TML" },
  "cta.hsk": { vi: "Xem khóa học HSK", zh: "查看 HSK 课程", en: "View HSK courses" },
  "menu.open": { vi: "Mở menu", zh: "打开菜单", en: "Open menu" },
  "brand.sub": { vi: "Liên Đoàn Hán Ngữ · 普通话联盟", zh: "普通话联盟 · Liên Đoàn Hán Ngữ", en: "Mandarin League · 普通话联盟" },
  "tagline": {
    vi: "Kết nối người học, nhà giáo dục và cơ hội giữa Việt Nam và Trung Quốc.",
    zh: "连接越南与中国的学习者、教育者与机遇。",
    en: "Connecting learners, educators & opportunities across Vietnam and China.",
  },
  "footer.explore": { vi: "Khám phá", zh: "探索", en: "Explore" },
  "footer.contact": { vi: "Liên hệ", zh: "联系", en: "Contact" },
  "footer.online": { vi: "Hoạt động trực tuyến", zh: "线上运营", en: "Operating online" },
  "footer.portal": { vi: "Cổng thành viên", zh: "会员门户", en: "Member Portal" },
  "footer.rights": { vi: "The Mandarin League. All rights reserved.", zh: "The Mandarin League. 版权所有。", en: "The Mandarin League. All rights reserved." },
  "footer.tagline": { vi: "Liên Đoàn Hán Ngữ · Online Learning Community", zh: "普通话联盟 · 线上学习社区", en: "Liên Đoàn Hán Ngữ · Online Learning Community" },
  "home.lead": {
    vi: "Cộng đồng học tiếng Trung trực tuyến dành cho người Việt – nơi học HSK bài bản, giao lưu văn hóa và cùng nhau phát triển.",
    zh: "面向越南人的线上中文学习社区——系统学习 HSK、交流文化、共同成长。",
    en: "An online Chinese learning community for Vietnamese learners — structured HSK study, cultural exchange and growing together.",
  },
  "soon.text": {
    vi: "Trang này đang được xây dựng và sẽ ra mắt trong giai đoạn tiếp theo.",
    zh: "本页面正在建设中，将在下一阶段上线。",
    en: "This page is under construction and will launch in the next phase.",
  },
} satisfies Record<string, Entry>;

export type DictKey = keyof typeof DICT;
