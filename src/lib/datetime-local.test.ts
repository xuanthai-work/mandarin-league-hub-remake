import { describe, expect, it } from "vitest";

import {
  datePart,
  formatLocal,
  isoToLocal,
  joinLocal,
  localToIso,
  parseLocal,
  timePart,
  timeSlots,
  toLocalValue,
  withSlot,
} from "./datetime-local";

describe("parseLocal", () => {
  it("đọc đúng chuỗi YYYY-MM-DDTHH:mm", () => {
    const d = parseLocal("2026-11-05T19:30");
    expect(d).toBeInstanceOf(Date);
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(10);
    expect(d?.getDate()).toBe(5);
    expect(d?.getHours()).toBe(19);
    expect(d?.getMinutes()).toBe(30);
  });

  it("trả về undefined với chuỗi rỗng hoặc sai định dạng", () => {
    expect(parseLocal("")).toBeUndefined();
    expect(parseLocal("2026-11-05")).toBeUndefined();
    expect(parseLocal("abc")).toBeUndefined();
    expect(parseLocal(null)).toBeUndefined();
    expect(parseLocal(undefined)).toBeUndefined();
  });
});

describe("toLocalValue", () => {
  it("đệm số 0 cho tháng, ngày, giờ, phút", () => {
    expect(toLocalValue(new Date(2026, 0, 3, 7, 5))).toBe("2026-01-03T07:05");
  });
});

describe("isoToLocal và localToIso", () => {
  it("đi vòng giữ nguyên giá trị local", () => {
    const v = "2026-11-05T19:30";
    expect(isoToLocal(localToIso(v))).toBe(v);
  });

  it("trả về chuỗi rỗng khi ISO rỗng hoặc không hợp lệ", () => {
    expect(isoToLocal(null)).toBe("");
    expect(isoToLocal("")).toBe("");
    expect(isoToLocal("not-a-date")).toBe("");
  });

  it("trả về null khi local rỗng", () => {
    expect(localToIso("")).toBeNull();
    expect(localToIso(null)).toBeNull();
  });
});

describe("datePart và timePart", () => {
  it("tách đúng phần ngày và giờ", () => {
    expect(datePart("2026-11-05T19:30")).toBe("2026-11-05");
    expect(timePart("2026-11-05T19:30")).toBe("19:30");
  });

  it("trả về chuỗi rỗng với chuỗi sai", () => {
    expect(datePart("abc")).toBe("");
    expect(timePart("")).toBe("");
    expect(datePart(null)).toBe("");
    expect(timePart(undefined)).toBe("");
  });
});

describe("joinLocal", () => {
  it("ghép ngày và giờ", () => {
    expect(joinLocal("2026-11-05", "19:30")).toBe("2026-11-05T19:30");
  });
});

describe("timeSlots", () => {
  it("mặc định có 96 mốc 15 phút, từ 00:00 đến 23:45", () => {
    const slots = timeSlots();
    expect(slots).toHaveLength(96);
    expect(slots[0]).toBe("00:00");
    expect(slots[95]).toBe("23:45");
  });

  it("bước 30 phút có 48 mốc", () => {
    expect(timeSlots(30)).toHaveLength(48);
  });
});

describe("withSlot", () => {
  it("chèn giờ lẻ đúng vị trí", () => {
    const slots = withSlot(timeSlots(), "19:07");
    const i = slots.indexOf("19:07");
    expect(i).toBeGreaterThan(-1);
    expect(slots[i - 1]).toBe("19:00");
    expect(slots[i + 1]).toBe("19:15");
  });

  it("không nhân bản khi giờ đã có trong danh sách", () => {
    const slots = timeSlots();
    expect(withSlot(slots, "19:00")).toBe(slots);
  });

  it("bỏ qua extra rỗng", () => {
    const slots = timeSlots();
    expect(withSlot(slots, "")).toBe(slots);
  });
});

describe("formatLocal", () => {
  it("hiển thị DD/MM/YYYY · HH:mm", () => {
    expect(formatLocal("2026-11-05T09:05")).toBe("05/11/2026 · 09:05");
  });

  it("trả về chuỗi rỗng khi không hợp lệ", () => {
    expect(formatLocal("")).toBe("");
    expect(formatLocal(null)).toBe("");
    expect(formatLocal("abc")).toBe("");
  });
});
