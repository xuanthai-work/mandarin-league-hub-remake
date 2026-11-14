import { describe, expect, it } from "vitest";
import { PHRASES } from "./phrases";
import { trPhrase } from "./index";

describe("PHRASES (TASK-GE-205)", () => {
  const taskPhrases = [
    "buổi",
    "Tin tức mới sẽ sớm được cập nhật.",
    "Danh sách đối tác sẽ được TML công bố chính thức.",
    "người",
    "Tôi không phải là người máy",
    "Đóng",
    "Đọc",
    "Viết",
    "Nói",
    "Giỏi",
    "Khá",
    "Đạt",
    "ĐẠT",
    "ngưỡng",
    "Khám phá khóa học",
    "Không tải được danh sách",
    "Vui lòng thử lại sau.",
    "Không có giáo viên phù hợp",
    "Thử từ khóa hoặc bộ lọc khác.",
    "Hồ sơ đội ngũ giảng viên sẽ sớm được công bố.",
    "Không tìm thấy hồ sơ",
    "Hồ sơ không tồn tại hoặc chưa được công khai.",
  ];

  it("contains non-empty zh and en translations for every task phrase", () => {
    for (const phrase of taskPhrases) {
      const entry = PHRASES[phrase];
      expect(entry, `Missing phrase in PHRASES: "${phrase}"`).toBeDefined();
      expect(entry![0].trim().length).toBeGreaterThan(0);
      expect(entry![1].trim().length).toBeGreaterThan(0);
    }
  });

  it("trPhrase translates correctly across all three languages", () => {
    expect(trPhrase("vi", "Tin tức mới sẽ sớm được cập nhật.")).toBe(
      "Tin tức mới sẽ sớm được cập nhật.",
    );
    expect(trPhrase("zh", "Tin tức mới sẽ sớm được cập nhật.")).toBe("新动态即将更新。");
    expect(trPhrase("en", "Tin tức mới sẽ sớm được cập nhật.")).toBe(
      "New updates will be published soon.",
    );

    expect(trPhrase("zh", "Tôi không phải là người máy")).toBe("我不是机器人");
    expect(trPhrase("en", "Tôi không phải là người máy")).toBe("I'm not a robot");

    expect(trPhrase("zh", "Khám phá khóa học")).toBe("探索课程");
    expect(trPhrase("en", "Khám phá khóa học")).toBe("Explore courses");
  });
});
