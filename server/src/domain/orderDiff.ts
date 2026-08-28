/**
 * So sánh Đơn hàng trước và sau khi chủ quán sửa.
 * Hàm thuần, không chạm cơ sở dữ liệu, để kiểm thử được ở tầng miền và để phần
 * dựng thông báo Teams chỉ việc đọc kết quả.
 */
import { fmtVnd } from '../util.js'

export interface DiffOrder {
  customerName: string
  receiveMode: 'pickup' | 'delivery'
  location: string
  note: string
  paymentMethod: 'transfer' | 'cash'
  total: number
  items: Array<{ name: string; optionSummary: string; qty: number; unitPrice: number }>
}

export interface Change {
  label: string
  before: string
  after: string
}

const RECEIVE_TEXT = { pickup: 'Nhận tại quán', delivery: 'Giao tận nơi' } as const
const PAY_TEXT = { transfer: 'Chuyển khoản', cash: 'Tiền mặt khi nhận' } as const

/** Một dòng món viết gọn thành chữ để đối chiếu và để hiện trên Teams. */
export function lineText(i: DiffOrder['items'][number]): string {
  return `${i.name}${i.optionSummary ? ` (${i.optionSummary})` : ''} × ${i.qty}`
}

function itemsText(items: DiffOrder['items']): string {
  return items.length === 0 ? '(không có món nào)' : items.map(lineText).join('\n')
}

/**
 * Những mục thật sự đổi. Mục không đổi bị bỏ ra để thông báo trên Teams chỉ nói
 * đúng phần đã sửa, người đọc không phải tự dò.
 */
export function diffOrder(before: DiffOrder, after: DiffOrder): Change[] {
  const changes: Change[] = []
  const add = (label: string, b: string, a: string): void => {
    if (b !== a) changes.push({ label, before: b, after: a })
  }

  add('Khách', before.customerName, after.customerName)
  add('Cách nhận', RECEIVE_TEXT[before.receiveMode], RECEIVE_TEXT[after.receiveMode])
  add('Vị trí giao', before.location || '(không có)', after.location || '(không có)')
  add('Ghi chú', before.note || '(không có)', after.note || '(không có)')
  add('Thanh toán', PAY_TEXT[before.paymentMethod], PAY_TEXT[after.paymentMethod])
  add('Món', itemsText(before.items), itemsText(after.items))
  add('Tổng tiền', fmtVnd(before.total), fmtVnd(after.total))
  return changes
}

/** Một dòng tóm tắt cho danh sách hội thoại Teams. */
export function changeSummary(changes: Change[]): string {
  if (changes.length === 0) return 'không có gì đổi'
  return changes.map((c) => c.label.toLowerCase()).join(', ')
}
