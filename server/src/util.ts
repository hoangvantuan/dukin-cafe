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
