import { describe, expect, it } from "vitest";

import { csvCell, neutralizeFormula } from "./csv";

describe("neutralizeFormula", () => {
  it("chặn ô bắt đầu bằng = và @", () => {
    expect(neutralizeFormula("=1+1")).toBe("'=1+1");
    expect(neutralizeFormula("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("chặn + và - khi phía sau không phải số", () => {
    expect(neutralizeFormula('+HYPERLINK("x")')).toBe(`'+HYPERLINK("x")`);
    expect(neutralizeFormula("-cmd|' /C calc'!A0")).toBe("'-cmd|' /C calc'!A0");
    expect(neutralizeFormula("-2+3")).toBe("'-2+3");
  });

  it("chặn tab và xuống dòng ở đầu", () => {
    expect(neutralizeFormula("\t=1")).toBe("'\t=1");
    expect(neutralizeFormula("\r=1")).toBe("'\r=1");
  });

  it("giữ nguyên số điện thoại, số âm, số dương và chữ thường", () => {
    expect(neutralizeFormula("+84 912 345 678")).toBe("+84 912 345 678");
    expect(neutralizeFormula("-8")).toBe("-8");
    expect(neutralizeFormula("+12")).toBe("+12");
    expect(neutralizeFormula("Nguyễn Văn A")).toBe("Nguyễn Văn A");
    expect(neutralizeFormula("")).toBe("");
  });
});

describe("csvCell", () => {
  it('bọc ngoặc kép và nhân đôi dấu "', () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell("a,b")).toBe('"a,b"');
  });

  it("đổi null/undefined thành ô rỗng và số thành chữ", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
    expect(csvCell(12)).toBe('"12"');
  });

  it('vừa chặn công thức vừa nhân đôi dấu "', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
  });
});
