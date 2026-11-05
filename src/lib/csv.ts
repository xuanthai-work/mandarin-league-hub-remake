/**
 * Excel / Google Sheets coi ô bắt đầu bằng = + - @ (hoặc tab, xuống dòng) là công thức.
 * Thêm dấu ' phía trước để ô luôn được hiểu là chữ (khuyến nghị của OWASP).
 * Số điện thoại "+84 912 345 678" và số âm "-8" được giữ nguyên vì không thể là công thức.
 */
export function neutralizeFormula(text: string): string {
  if (/^[=@\t\r]/.test(text)) return `'${text}`;
  if (/^[+-]/.test(text) && !/^[+-][\d\s().,]*$/.test(text)) return `'${text}`;
  return text;
}

/** Một ô CSV an toàn: chặn công thức, nhân đôi dấu ", luôn bọc trong dấu ". */
export function csvCell(value: unknown): string {
  const text = neutralizeFormula(String(value ?? ""));
  return `"${text.replace(/"/g, '""')}"`;
}
