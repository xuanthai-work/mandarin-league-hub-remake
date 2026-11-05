/**
 * Loại bỏ dấu tiếng Việt, chuyển đ/Đ thành d/D, đưa về chữ thường và xóa khoảng trắng thừa.
 * Ví dụ: "Nguyễn Thị Hồng Ngọc" -> "nguyen thi hong ngoc"
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kiểm tra chuỗi target có khớp với query tìm kiếm hay không:
 * 1. Không phân biệt chữ hoa / chữ thường.
 * 2. Không phân biệt có dấu / không dấu (gõ "ngoc" khớp "Ngọc", gõ "Ngọc" cũng khớp "Ngọc").
 * 3. Hỗ trợ tìm kiếm theo nhiều từ (multi-word token): "hang 0002" khớp "Hằng - TML-MBR-2611-0002".
 */
export function matchesSearch(
  target: string | null | undefined,
  query: string | null | undefined,
): boolean {
  if (!query || !query.trim()) return true;
  if (!target) return false;

  const rawTarget = target.toLowerCase();
  const rawQuery = query.toLowerCase().trim();

  // Khớp trực tiếp cả cụm (có dấu)
  if (rawTarget.includes(rawQuery)) return true;

  const normTarget = removeVietnameseTones(target);
  const normQuery = removeVietnameseTones(query);

  // Khớp cả cụm (không dấu)
  if (normTarget.includes(normQuery)) return true;

  // Khớp từng từ (multi-tokens)
  const tokens = normQuery.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every((token) => normTarget.includes(token) || rawTarget.includes(token));
  }

  return false;
}
