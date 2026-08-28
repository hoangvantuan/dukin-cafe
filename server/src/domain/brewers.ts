import { nameKey } from '../util.js'

/** Tối đa tên Người pha chủ quán lưu được; quán nội bộ không có nhóm to hơn thế. */
export const MAX_BREWERS = 20

/**
 * Danh sách Người pha giới thiệu ở cuối Trang bán, lưu dạng chuỗi JSON các tên.
 * Chỉ là tên để Khách biết ai pha cà phê cho mình: không mã Teams, không chức
 * danh, không tài khoản. Mặc định rỗng, vì công khai tên đồng nghiệp trên một
 * trang ra Internet phải là việc chủ quán chủ động làm sau khi đã hỏi họ.
 *
 * Bỏ dòng rỗng, gộp khoảng trắng thừa và bỏ tên trùng (không phân biệt hoa
 * thường), giữ nguyên thứ tự chủ quán nhập. Không tự cắt bớt: tuyến lưu Cấu
 * hình mới là chỗ chặn khi vượt MAX_BREWERS, để chủ quán biết mà bỏ tên.
 */
export function parseBrewers(raw: string): string[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw || '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of parsed) {
    if (typeof v !== 'string') continue
    const name = v.normalize('NFC').trim().replace(/\s+/g, ' ')
    if (!name) continue
    const key = nameKey(name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

export function serializeBrewers(list: string[]): string {
  return JSON.stringify(list)
}
