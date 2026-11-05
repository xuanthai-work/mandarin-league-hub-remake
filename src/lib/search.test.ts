import { describe, expect, it } from "vitest";

import { matchesSearch, removeVietnameseTones } from "./search";

describe("removeVietnameseTones", () => {
  it("bỏ dấu thanh, dấu mũ và dấu móc", () => {
    expect(removeVietnameseTones("Nguyễn Thị Hồng Ngọc")).toBe("nguyen thi hong ngoc");
    expect(removeVietnameseTones("Hằng")).toBe("hang");
    expect(removeVietnameseTones("Mĩ Ái")).toBe("mi ai");
  });

  it("chuyển đ/Đ thành d và xóa khoảng trắng thừa", () => {
    expect(removeVietnameseTones("Đoàn   Văn  Đan")).toBe("doan van dan");
    expect(removeVietnameseTones("  ĐÀO  ")).toBe("dao");
  });

  it("trả về chuỗi rỗng với input rỗng", () => {
    expect(removeVietnameseTones("")).toBe("");
  });
});

describe("matchesSearch", () => {
  const name = "Nguyễn Thị Hồng Ngọc";
  const row = "Hằng test - TML-MBR-2611-0002";

  it("khớp tên có dấu khi gõ không dấu", () => {
    expect(matchesSearch(name, "ngoc")).toBe(true);
    expect(matchesSearch(name, "hong ngoc")).toBe(true);
  });

  it("khớp tên có dấu khi gõ có dấu", () => {
    expect(matchesSearch(name, "Ngọc")).toBe(true);
    expect(matchesSearch(name, "NGUYỄN")).toBe(true);
  });

  it("xử lý đ/Đ", () => {
    expect(matchesSearch("Nguyễn Đan", "dan")).toBe(true);
    expect(matchesSearch("Đoàn", "doan")).toBe(true);
    expect(matchesSearch("Đặng Thị Mía", "mia")).toBe(true);
  });

  it("khớp tiền tố khi gõ dở", () => {
    expect(matchesSearch("Nguyễn", "nguy")).toBe(true);
    expect(matchesSearch("Hằng", "ha")).toBe(true);
  });

  it("khớp nhiều từ rời nhau (tên + mã)", () => {
    expect(matchesSearch(row, "hang 0002")).toBe(true);
    expect(matchesSearch(row, "0002 hang")).toBe(true);
    expect(matchesSearch(row, "hang 9999")).toBe(false);
  });

  it("khớp theo mã code", () => {
    expect(matchesSearch("TML-MBR-2611-0002", "0002")).toBe(true);
    expect(matchesSearch("TML-MBR-2611-0002", "tml-mbr")).toBe(true);
  });

  it("query rỗng hoặc chỉ khoảng trắng luôn trả về true", () => {
    expect(matchesSearch(name, "")).toBe(true);
    expect(matchesSearch(name, "   ")).toBe(true);
    expect(matchesSearch(name, null)).toBe(true);
    expect(matchesSearch(name, undefined)).toBe(true);
  });

  it("target rỗng trả về false khi có query", () => {
    expect(matchesSearch("", "ngoc")).toBe(false);
    expect(matchesSearch(null, "ngoc")).toBe(false);
    expect(matchesSearch(undefined, "ngoc")).toBe(false);
  });

  it("không khớp khi từ khóa không xuất hiện", () => {
    expect(matchesSearch(name, "trung")).toBe(false);
  });
});
