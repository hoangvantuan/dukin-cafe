import crypto from 'node:crypto'

/** Bỏ dấu tiếng Việt cho nội dung chuyển khoản (chỉ giữ ASCII). */
export function asciiFold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

/** Định dạng tiền kiểu Việt: 55000 -> "55.000đ". Dùng chung toàn hệ thống cho nhất quán. */
export function fmtVnd(n: number): string {
  return `${n.toLocaleString('vi-VN')}đ`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Khóa định danh Khách: tên viết thường, gộp khoảng trắng, chuẩn hóa Unicode.
 * Giữ nguyên dấu tiếng Việt vì "Hoàng" và "Hoang" là hai người khác nhau;
 * chỉ bỏ khác biệt hoa thường và khoảng trắng thừa.
 * Không dùng COLLATE NOCASE của SQLite: nó chỉ gộp hoa thường trong bảng ASCII,
 * nên "Đức" và "đức" vẫn lọt thành hai dòng.
 */
export function nameKey(s: string): string {
  return s.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
}
