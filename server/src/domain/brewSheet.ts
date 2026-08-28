/**
 * Gộp Hàng đợi xử lý thành Bảng pha chế. Hàm thuần, không chạm cơ sở dữ liệu,
 * để kiểm thử được ở tầng miền mà không cần dựng máy chủ.
 */

/** Một dòng món của một Đơn hàng, kèm Trạng thái Đơn hàng chứa nó. */
export interface BrewLine {
  status: string
  name: string
  optionSummary: string
  qty: number
}

/** Một cặp Món và Tùy chọn đã gộp, kèm số ly phải pha. */
export interface BrewRow {
  name: string
  optionSummary: string
  qty: number
}

export interface BrewSheetResult {
  rows: BrewRow[]
  /** Tổng số ly của cả bảng. */
  totalCups: number
}

/**
 * Trạng thái Đơn hàng đã đóng: pha xong rồi hoặc không pha nữa. Bảng pha chế
 * chỉ gộp phần còn lại, tức Hàng đợi xử lý.
 */
const CLOSED_STATUSES = new Set(['done', 'cancelled'])

/**
 * Gộp theo cặp Món và Tùy chọn trên toàn bộ Hàng đợi xử lý.
 * Xếp theo tên Món rồi tới Tùy chọn để chủ quán pha lần lượt từng Món.
 */
export function brewSheet(lines: BrewLine[]): BrewSheetResult {
  const agg = new Map<string, BrewRow>()
  for (const l of lines) {
    if (CLOSED_STATUSES.has(l.status)) continue
    const key = `${l.name}||${l.optionSummary}`
    const cur = agg.get(key) ?? { name: l.name, optionSummary: l.optionSummary, qty: 0 }
    cur.qty += l.qty
    agg.set(key, cur)
  }
  const rows = [...agg.values()].sort(
    (a, b) =>
      a.name.localeCompare(b.name, 'vi') || a.optionSummary.localeCompare(b.optionSummary, 'vi'),
  )
  return { rows, totalCups: rows.reduce((s, r) => s + r.qty, 0) }
}
