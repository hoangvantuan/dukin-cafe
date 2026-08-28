import { allRows, db, findCustomer, getRow, getSettings, tx, upsertCustomer } from './db.js'
import { vnNow } from './domain/day.js'
import type { DiffOrder } from './domain/orderDiff.js'
import { asciiFold, nameKey, nowIso } from './util.js'

export type OrderStatus = 'new' | 'confirmed' | 'paid' | 'done' | 'cancelled'
export type Channel = 'web' | 'zalo'

/** Quỹ đạo trạng thái đơn: chỉ chủ quán bấm chuyển. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['confirmed', 'paid', 'done', 'cancelled'],
  confirmed: ['paid', 'done', 'cancelled'],
  paid: ['done', 'cancelled'],
  done: ['cancelled'],
  cancelled: [],
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: '🆕 Mới',
  confirmed: '👀 Đã xác nhận',
  paid: '💰 Đã thu tiền',
  done: '✅ Hoàn tất',
  cancelled: '❌ Đã hủy',
}

// Dòng khớp tên cột trong schema orders/order_items.
export interface OrderRow {
  id: number
  customer_name: string
  channel: Channel
  receive_mode: 'pickup' | 'delivery'
  location: string
  note: string
  customer_key: string
  order_date: string
  payment_method: 'transfer' | 'cash'
  status: OrderStatus
  total: number
  teams_thread: string
  created_at: string
  updated_at: string
}

export interface OrderItemRow {
  id: number
  order_id: number
  item_id: number | null
  name: string
  option_summary: string
  option_ids: string
  unit_price: number
  qty: number
}

/** Mã Tùy chọn của một dòng món; dòng cũ chưa suy ra được thì trả mảng rỗng. */
export function lineOptionIds(row: OrderItemRow): number[] {
  try {
    const v = JSON.parse(row.option_ids || '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : []
  } catch {
    return []
  }
}

export interface IncomingLine {
  itemId: number
  qty: number
  optionIds: number[]
}

export interface IncomingOrder {
  customerName: string
  receiveMode: 'pickup' | 'delivery'
  location: string
  note: string
  paymentMethod: 'transfer' | 'cash'
  items: IncomingLine[]
}

export function orderCode(id: number): string {
  return `#${String(id).padStart(3, '0')}`
}

/**
 * Trần số đơn nhận trong ngày; null là không giới hạn.
 * Thay cho giới hạn theo Khung nhận hàng cũ: quán chỉ cần chặn những hôm quá tải.
 */
export function dailyCapacity(): number | null {
  const n = Number(getSettings().dailyCapacity)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Số đơn đã nhận trong một ngày, không kể đơn đã hủy. */
export function ordersOnDate(date: string): number {
  const row = getRow<{ c: number }>(
    db.prepare("SELECT COUNT(*) AS c FROM orders WHERE order_date = ? AND status != 'cancelled'"),
    date,
  )
  return row?.c ?? 0
}

/** Hôm nay quán còn nhận đơn nữa không, kèm số chỗ còn lại nếu có đặt trần. */
export function intakeToday(): { open: boolean; remaining: number | null } {
  const cap = dailyCapacity()
  if (cap == null) return { open: true, remaining: null }
  const remaining = cap - ordersOnDate(vnNow().date)
  return { open: remaining > 0, remaining: Math.max(0, remaining) }
}

interface SnapshotGroup {
  name: string
  required: boolean
  multiple: boolean
  options: Map<number, { name: string; priceAdd: number }>
}

interface SnapshotItem {
  name: string
  price: number
  groups: Map<number, SnapshotGroup>
}

function loadSnapshot(): Map<number, SnapshotItem> {
  interface ItemRow { id: number; name: string; price: number }
  interface GroupRow { id: number; item_id: number; name: string; required: number; multiple: number }
  interface OptionRow { id: number; group_id: number; name: string; price_add: number }
  const items = allRows<ItemRow>(db.prepare('SELECT id, name, price FROM menu_items WHERE active = 1'))
  const groups = allRows<GroupRow>(db.prepare('SELECT id, item_id, name, required, multiple FROM option_groups'))
  const options = allRows<OptionRow>(db.prepare('SELECT id, group_id, name, price_add FROM options'))

  const optionsByGroup = new Map<number, Map<number, { name: string; priceAdd: number }>>()
  for (const o of options) {
    const m = optionsByGroup.get(o.group_id) ?? new Map()
    m.set(o.id, { name: o.name, priceAdd: o.price_add })
    optionsByGroup.set(o.group_id, m)
  }
  const map = new Map<number, SnapshotItem>()
  for (const it of items) {
    map.set(it.id, { name: it.name, price: it.price, groups: new Map() })
  }
  for (const g of groups) {
    const item = map.get(g.item_id)
    if (!item) continue
    item.groups.set(g.id, {
      name: g.name,
      required: g.required === 1,
      multiple: g.multiple === 1,
      options: optionsByGroup.get(g.id) ?? new Map(),
    })
  }
  return map
}

export interface ResolvedLine {
  itemId: number
  name: string
  optionSummary: string
  /** Mã Tùy chọn đã chọn, giữ lại để dựng form khi sửa đơn. */
  optionIds: number[]
  unitPrice: number
  qty: number
}

/**
 * Giá và tên luôn tính lại phía máy chủ từ thực đơn, không tin giá client gửi.
 * Với mỗi nhóm: bắt buộc chọn đúng 1 nếu required và không multiple.
 */
export function resolveLines(
  lines: unknown,
): { ok: true; lines: ResolvedLine[]; total: number } | { ok: false; error: string } {
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 20) {
    return { ok: false, error: 'Đơn cần 1 tới 20 dòng món' }
  }
  const menu = loadSnapshot()
  const resolved: ResolvedLine[] = []
  let total = 0
  for (const raw of lines) {
    if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Dòng món không hợp lệ' }
    const line = raw as Record<string, unknown>
    const itemId = line.itemId
    const qty = line.qty
    if (typeof itemId !== 'number' || !Number.isInteger(itemId)) return { ok: false, error: 'Mã món không hợp lệ' }
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 50) {
      return { ok: false, error: 'Số lượng từ 1 tới 50' }
    }
    const item = menu.get(itemId)
    if (!item) return { ok: false, error: 'Món không còn bán' }
    const optionIds = Array.isArray(line.optionIds) ? line.optionIds : []
    for (const oid of optionIds) {
      if (typeof oid !== 'number' || !Number.isInteger(oid)) return { ok: false, error: 'Lựa chọn không hợp lệ' }
    }

    // Lựa chọn phải thuộc đúng món này.
    const knownIds = new Set<number>()
    for (const group of item.groups.values()) {
      for (const oid of group.options.keys()) knownIds.add(oid)
    }
    if (optionIds.some((oid) => !knownIds.has(oid))) return { ok: false, error: 'Lựa chọn không thuộc món này' }

    const chosenNames: string[] = []
    let priceAdd = 0
    for (const group of item.groups.values()) {
      const picked = optionIds.filter((oid) => group.options.has(oid))
      if (group.required && !group.multiple && picked.length !== 1) {
        return { ok: false, error: `Món "${item.name}" cần chọn ${group.name}` }
      }
      for (const oid of picked) {
        const o = group.options.get(oid)!
        chosenNames.push(o.name)
        priceAdd += o.priceAdd
      }
    }
    const unitPrice = item.price + priceAdd
    resolved.push({
      itemId,
      name: item.name,
      optionSummary: chosenNames.join(', '),
      optionIds: [...optionIds],
      unitPrice,
      qty,
    })
    total += unitPrice * qty
  }
  return { ok: true, lines: resolved, total }
}

export function validateIncoming(body: unknown): { ok: true; order: IncomingOrder } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Đơn không hợp lệ' }
  const b = body as Record<string, unknown>
  const customerName =
    typeof b.customerName === 'string' ? b.customerName.trim().replace(/\s+/g, ' ') : ''
  if (customerName.length < 1 || customerName.length > 100) return { ok: false, error: 'Tên khách từ 1 tới 100 ký tự' }
  const receiveMode = b.receiveMode === 'delivery' ? 'delivery' : b.receiveMode === 'pickup' ? 'pickup' : null
  if (!receiveMode) return { ok: false, error: 'Cách nhận hàng không hợp lệ' }
  const location = typeof b.location === 'string' ? b.location.trim().slice(0, 200) : ''
  if (receiveMode === 'delivery' && location.length === 0) {
    return { ok: false, error: 'Cần Vị trí giao khi chọn giao tận nơi' }
  }
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 500) : ''
  const paymentMethod = b.paymentMethod === 'transfer' ? 'transfer' : b.paymentMethod === 'cash' ? 'cash' : null
  if (!paymentMethod) return { ok: false, error: 'Cách thanh toán không hợp lệ' }
  return {
    ok: true,
    order: { customerName, receiveMode, location, note, paymentMethod, items: [] },
  }
}

export function createOrder(
  order: Omit<IncomingOrder, 'items'> & { items: unknown },
  channel: Channel,
):
  | { ok: true; id: number; total: number; customerName: string; lines: ResolvedLine[] }
  | { ok: false; error: string } {
  const resolved = resolveLines(order.items)
  if (!resolved.ok) return resolved
  const orderDate = vnNow().date
  const cap = dailyCapacity()
  const ts = nowIso()

  const insertOrder = db.prepare(`
    INSERT INTO orders(customer_name, customer_key, channel, receive_mode, location, note, order_date,
      payment_method, status, total, created_at, updated_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
  `)
  const insertLine = db.prepare(`
    INSERT INTO order_items(order_id, item_id, name, option_summary, option_ids, unit_price, qty)
    VALUES(?, ?, ?, ?, ?, ?, ?)
  `)

  // Đếm trần nằm trong giao dịch cùng lệnh ghi: hai Khách bấm đặt cùng lúc thì
  // đơn thứ hai thấy đúng số đã ghi, không vượt trần.
  const created = tx(() => {
    if (cap != null && ordersOnDate(orderDate) >= cap) return null

    // Khách đã có trong Danh bạ thì đơn dùng đúng tên hiển thị đã lưu, để cùng một
    // người không tách thành nhiều tên chỉ vì gõ khác hoa thường.
    const known = findCustomer(order.customerName)
    const customerName = known ? known.name : order.customerName

    const res = insertOrder.run(
      customerName, nameKey(customerName), channel, order.receiveMode, order.location, order.note,
      orderDate, order.paymentMethod, resolved.total, ts, ts,
    )
    const orderId = Number(res.lastInsertRowid)
    for (const l of resolved.lines) {
      insertLine.run(orderId, l.itemId, l.name, l.optionSummary, JSON.stringify(l.optionIds), l.unitPrice, l.qty)
    }
    // Ghi tên vào Danh bạ nhưng giữ nguyên mã Teams đã liên kết trước đó.
    upsertCustomer(customerName, '', true)
    return { orderId, customerName }
  })

  if (!created) return { ok: false, error: 'Hôm nay quán đã nhận đủ đơn, hẹn bạn ngày mai nhé' }
  return {
    ok: true,
    id: created.orderId,
    total: resolved.total,
    customerName: created.customerName,
    lines: resolved.lines,
  }
}

/** Trạng thái không cho sửa nữa: đơn đã đóng hẳn. */
export const LOCKED_FOR_EDIT: OrderStatus[] = ['cancelled']

export interface EditableFields {
  customerName: string
  receiveMode: 'pickup' | 'delivery'
  location: string
  note: string
  paymentMethod: 'transfer' | 'cash'
}

/**
 * Chủ quán sửa Đơn hàng: đổi thông tin nhận hàng và đổi cả danh sách Món.
 * Giá luôn tính lại từ Thực đơn hiện hành, không tin số client gửi.
 * Không đụng Trạng thái Đơn hàng và không đụng Luồng Teams đã mở.
 */
export function updateOrder(
  id: number,
  fields: EditableFields,
  items: unknown,
): { ok: true; order: OrderRow } | { ok: false; error: string; code?: number } {
  const current = loadOrder(id)
  if (!current) return { ok: false, error: 'Không thấy đơn', code: 404 }
  if (LOCKED_FOR_EDIT.includes(current.status)) {
    return { ok: false, error: `Đơn ${STATUS_LABEL[current.status]} thì không sửa được nữa`, code: 400 }
  }
  const resolved = resolveLines(items)
  if (!resolved.ok) return resolved

  const insertLine = db.prepare(`
    INSERT INTO order_items(order_id, item_id, name, option_summary, option_ids, unit_price, qty)
    VALUES(?, ?, ?, ?, ?, ?, ?)
  `)
  tx(() => {
    const known = findCustomer(fields.customerName)
    const customerName = known ? known.name : fields.customerName
    db.prepare(`
      UPDATE orders SET customer_name = ?, customer_key = ?, receive_mode = ?, location = ?,
        note = ?, payment_method = ?, total = ?, updated_at = ?
      WHERE id = ?
    `).run(
      customerName, nameKey(customerName), fields.receiveMode, fields.location, fields.note,
      fields.paymentMethod, resolved.total, nowIso(), id,
    )
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id)
    for (const l of resolved.lines) {
      insertLine.run(id, l.itemId, l.name, l.optionSummary, JSON.stringify(l.optionIds), l.unitPrice, l.qty)
    }
    upsertCustomer(customerName, '', true)
  })
  const fresh = loadOrder(id)
  return fresh ? { ok: true, order: fresh } : { ok: false, error: 'Lỗi đọc lại đơn', code: 500 }
}

/** Ảnh chụp Đơn hàng dùng để so trước và sau khi sửa. */
export function orderSnapshot(o: OrderRow, items: OrderItemRow[]): DiffOrder {
  return {
    customerName: o.customer_name,
    receiveMode: o.receive_mode,
    location: o.location,
    note: o.note,
    paymentMethod: o.payment_method,
    total: o.total,
    items: items.map((i) => ({
      name: i.name,
      optionSummary: i.option_summary,
      qty: i.qty,
      unitPrice: i.unit_price,
    })),
  }
}

export function loadOrder(id: number): OrderRow | null {
  return getRow<OrderRow>(db.prepare('SELECT * FROM orders WHERE id = ?'), id) ?? null
}

export function loadOrderItems(orderId: number): OrderItemRow[] {
  return allRows<OrderItemRow>(db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id'), orderId)
}

/** Sinh URL ảnh VietQR từ thông tin cấu hình; null khi chưa cấu hình ngân hàng. */
export function vietQrUrl(amount: number, memo: string): string | null {
  const s = getSettings()
  if (!s.bankCode || !s.accountNo) return null
  const u = new URL(`https://img.vietqr.io/image/${s.bankCode}-${s.accountNo}-print.png`)
  u.searchParams.set('amount', String(amount))
  u.searchParams.set('addInfo', memo)
  if (s.accountName) u.searchParams.set('accountName', s.accountName)
  return u.toString()
}

/** Nội dung chuyển khoản đối chiếu được: mã đơn + tên khách không dấu. */
export function transferMemo(orderId: number, customerName: string): string {
  return `DUKIN ${orderCode(orderId)} ${asciiFold(customerName)}`.slice(0, 40)
}
