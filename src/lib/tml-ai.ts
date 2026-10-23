export type AssistantMode = "tutor" | "community";
export type HskLevel = "general" | 1 | 2 | 3 | 4 | 5 | 6;
export type DemoRequest = { mode: AssistantMode; level: HskLevel; text: string };
export type DemoReply = { kind: "example" | "unavailable"; text: string };
export type ChatService = (request: DemoRequest, signal: AbortSignal) => Promise<DemoReply>;
export type ChatMessage = { id: number; role: "user" | "assistant"; text: string; kind?: DemoReply["kind"]; context: string };

export const HSK_LEVELS: HskLevel[] = ["general", 1, 2, 3, 4, 5, 6];
export const levelLabel = (level: HskLevel) => level === "general" ? "Tiếng Trung tổng quát" : `HSK ${level}`;

export function suggestedPrompts(mode: AssistantMode, level: HskLevel): string[] {
  if (mode === "community") return [
    "Liên Đoàn Hán Ngữ là tổ chức như thế nào?",
    "Làm thế nào để tham gia Liên Đoàn Hán Ngữ?",
    "Tôi có thể tìm thông tin tuyển thành viên ở đâu?",
    "Làm thế nào để tìm các lớp học và hoạt động của TML?",
    "Tôi có thể tìm hiểu quyền lợi thành viên ở đâu?",
  ];
  return [
    "Giải thích sự khác nhau giữa 觉得 和 认为.",
    `Dạy tôi 10 từ vựng ${level === "general" ? "tiếng Trung" : `HSK ${level}`} theo chủ đề công việc.`,
    "Sửa lỗi ngữ pháp trong câu tiếng Trung của tôi.",
    `Tạo 5 câu hỏi trắc nghiệm HSK ${level === "general" ? "theo cấp độ tôi chọn" : level}.`,
    "Luyện hội thoại tiếng Trung khi đi phỏng vấn.",
  ];
}

const grammarExample = `**觉得 (juéde)** thường diễn đạt cảm nhận hoặc nhận xét cá nhân.

我觉得这本书很有意思。\nWǒ juéde zhè běn shū hěn yǒu yìsi.\nTôi thấy cuốn sách này rất thú vị.

**认为 (rènwéi)** thường diễn đạt quan điểm hoặc nhận định đã cân nhắc, hay gặp trong văn viết và ngữ cảnh trang trọng.

我认为学习语言需要坚持。\nWǒ rènwéi xuéxí yǔyán xūyào jiānchí.\nTôi cho rằng học ngôn ngữ cần sự kiên trì.

Trong nhiều trường hợp, cả hai đều dùng được; khác biệt nằm ở sắc thái và ngữ cảnh.`;

/** Only exact curated examples. Never interprets arbitrary questions or contacts an AI service. */
export function resolveDemo(request: DemoRequest): DemoReply {
  const text = request.text.trim();
  if (request.mode === "tutor" && text === suggestedPrompts("tutor", request.level)[0]) {
    return { kind: "example", text: grammarExample };
  }
  if (request.mode === "community") {
    const answers = [
      "The Mandarin League – Liên Đoàn Hán Ngữ là cộng đồng học tiếng Trung trực tuyến, kết nối người học, nhà giáo dục và cơ hội giữa Việt Nam và Trung Quốc. Bạn có thể đọc thông tin công khai tại [Giới thiệu](/about) và [Cộng đồng](/community).",
      "Bạn có thể tìm hiểu các đợt tuyển và vị trí đang được công bố tại [Tuyển thành viên](/join). Điều kiện và thời gian của từng đợt được ghi trên trang đó; ví dụ này không xác nhận bạn đủ điều kiện hay đã được tiếp nhận.",
      "Thông tin tuyển thành viên được công bố tại [Tuyển thành viên](/join). Hãy xem thông tin của đợt tuyển hiện tại trên trang này; ví dụ này không khẳng định đang có đợt tuyển mở.",
      "Bạn có thể xem [Khóa học](/courses), [Khóa học HSK](/courses/hsk) và [Hoạt động](/activities). Hãy kiểm tra lịch, trạng thái và thông tin đăng ký trực tiếp trên các trang đó.",
      "Bạn có thể tìm hiểu thông tin công khai tại [Cộng đồng](/community) hoặc hỏi TML qua [Liên hệ](/contact). Thành viên có tài khoản do Admin cấp có thể xem quyền lợi được cấp cho mình trong [Cổng thành viên](/login). Ví dụ này không truy cập tài khoản dùng chung hoặc dữ liệu nội bộ.",
    ];
    const index = suggestedPrompts("community", request.level).indexOf(text);
    const answer = answers[index];
    if (answer) return { kind: "example", text: answer };
  }
  return { kind: "unavailable", text: "Dịch vụ AI chưa được kết nối. Câu hỏi này chưa có câu trả lời mẫu và không được gửi đến nhà cung cấp AI. Bạn có thể thử ví dụ “Giải thích sự khác nhau giữa 觉得 和 认为.” hoặc các câu hỏi về Liên Đoàn." };
}

/** Local adapter; replace its implementation in a later, separately approved phase. */
export const demoChatService: ChatService = async (request, signal) => {
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    const cancel = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, 450);
    signal.addEventListener("abort", cancel, { once: true });
  });
  return resolveDemo(request);
};