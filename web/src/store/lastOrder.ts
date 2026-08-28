import type { MenuItem } from '../types'
import type { CartLine } from './cart'

const KHOA = 'dukin_don_lan_truoc'

/**
 * Một dòng của Đơn lần trước lưu ở máy Khách. Chỉ giữ mã Món, mã Tùy chọn và
 * số lượng, không giữ tên hay giá, để lần sau dựng lại luôn theo Thực đơn và
 * giá hiện tại của quán.
 */
export interface SavedLine {
  itemId: number
  qty: number
  optionIds: number[]
}

/** Đơn lần trước sau khi đối chiếu với Thực đơn hôm nay. */
export interface LastOrder {
  /** Các dòng còn đặt lại được. */
  lines: CartLine[]
  /** Số Món trong đơn cũ quán đã ẩn hoặc xóa nên phải bỏ khỏi đơn dựng lại. */
  dropped: number
}

function isSavedLine(x: unknown): x is SavedLine {
  if (typeof x !== 'object' || x === null) return false
  const l = x as Record<string, unknown>
  return (
    typeof l.itemId === 'number' &&
    typeof l.qty === 'number' &&
    Array.isArray(l.optionIds) &&
    l.optionIds.every((o) => typeof o === 'number')
  )
}

/** Đọc Đơn lần trước ở máy Khách; dữ liệu hỏng hay thiếu thì coi như chưa từng đặt. */
export function readSavedOrder(): SavedLine[] {
  try {
    const raw = localStorage.getItem(KHOA)
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    return Array.isArray(data) ? data.filter(isSavedLine) : []
  } catch {
    return []
  }
}

/** Lưu đơn vừa đặt thành công vào máy Khách, trả lại dạng đã lưu để dùng ngay. */
export function saveOrder(cart: CartLine[]): SavedLine[] {
  const saved: SavedLine[] = cart.map((l) => ({
    itemId: l.itemId,
    qty: l.qty,
    optionIds: l.optionIds,
  }))
  try {
    localStorage.setItem(KHOA, JSON.stringify(saved))
  } catch {
    // Máy Khách chặn lưu trữ thì thôi, không vì thế mà hỏng luồng đặt hàng.
  }
  return saved
}

/**
 * Chọn lại các Tùy chọn cũ còn tồn tại. Nhóm bắt buộc chọn một mà lựa chọn cũ
 * đã bị xóa thì lấy lựa chọn đầu, đúng như lúc Khách mới mở Thực đơn, để dòng
 * dựng lại vẫn là một Đơn hàng hợp lệ.
 */
function keepValidOptions(item: MenuItem, optionIds: number[]): number[] {
  const giu = new Set<number>()
  for (const g of item.groups) {
    for (const o of g.options) if (optionIds.includes(o.id)) giu.add(o.id)
  }
  for (const g of item.groups) {
    if (!g.required || g.multiple) continue
    if (g.options.some((o) => giu.has(o.id))) continue
    const dau = g.options[0]
    if (dau) giu.add(dau.id)
  }
  return [...giu].sort((a, b) => a - b)
}

/**
 * Dựng Đơn lần trước theo Thực đơn hiện tại. Món đã ẩn hoặc xóa không còn trong
 * Thực đơn công khai nên bị bỏ và đếm vào `dropped`. Trả null khi Khách chưa từng
 * đặt hoặc không còn Món nào đặt lại được.
 */
export function rebuildOrder(items: MenuItem[], saved: SavedLine[]): LastOrder | null {
  if (saved.length === 0 || items.length === 0) return null
  const itemsById = new Map(items.map((i) => [i.id, i]))
  const lines: CartLine[] = []
  let dropped = 0

  for (const s of saved) {
    const item = itemsById.get(s.itemId)
    if (!item) {
      dropped += 1
      continue
    }
    const optionIds = keepValidOptions(item, s.optionIds)
    const key = `${item.id}:${optionIds.join('-')}`
    const qty = Math.max(1, Math.min(20, Math.round(s.qty)))
    // Bỏ bớt Tùy chọn có thể làm hai dòng cũ trùng nhau, gộp lại cho gọn.
    const trung = lines.find((l) => l.key === key)
    if (trung) trung.qty = Math.min(20, trung.qty + qty)
    else lines.push({ key, itemId: item.id, qty, optionIds })
  }

  if (lines.length === 0) return null
  return { lines, dropped }
}

/** Thêm các dòng của Đơn lần trước vào khay, dòng trùng thì cộng dồn số lượng. */
export function mergeLines(cart: CartLine[], lines: CartLine[]): CartLine[] {
  const next = [...cart]
  for (const line of lines) {
    const i = next.findIndex((l) => l.key === line.key)
    if (i >= 0) next[i] = { ...next[i], qty: Math.min(20, next[i].qty + line.qty) }
    else next.push({ ...line })
  }
  return next
}
