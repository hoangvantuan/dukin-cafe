import { allRows, db, getRow, getSettings, tx } from './db.js'
import { computeSlots, vnNow, type SlotPart } from './domain/slots.js'
import { asciiFold, nowIso } from './util.js'

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
  slot_date: string
  slot_part: SlotPart
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
  unit_price: number
  qty: number
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
  slotDate: string
  slotPart: SlotPart
  paymentMethod: 'transfer' | 'cash'
  items: IncomingLine[]
}

export function orderCode(id: number): string {
  return `#${String(id).padStart(3, '0')}`
}

interface CountRow { slot_date: string; slot_part: string; c: number }

/** Đếm đơn đã chiếm chỗ mỗi khung (trừ đơn hủy). */
export function slotCounts(): Record<string, number> {
  const rows = allRows<CountRow>(
    db.prepare(
      "SELECT slot_date, slot_part, COUNT(*) AS c FROM orders WHERE status != 'cancelled' GROUP BY slot_date, slot_part",
    ),
  )
  return Object.fromEntries(rows.map((r) => [`${r.slot_date}|${r.slot_part}`, r.c]))
}

export function slotCapacity(): number | null {
  const n = Number(getSettings().slotCapacity)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function availableSlots() {
  const { date, minutes } = vnNow()
  return computeSlots({ todayDate: date, nowMinutes: minutes, capacity: slotCapacity(), counts: slotCounts() })
}

export function isSlotOpen(slotDate: string, part: SlotPart): boolean {
  return availableSlots().some((s) => s.date === slotDate && s.part === part)
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
    resolved.push({ itemId, name: item.name, optionSummary: chosenNames.join(', '), unitPrice, qty })
    total += unitPrice * qty
  }
  return { ok: true, lines: resolved, total }
}

export function validateIncoming(body: unknown): { ok: true; order: IncomingOrder } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Đơn không hợp lệ' }
  const b = body as Record<string, unknown>
  const customerName = typeof b.customerName === 'string' ? b.customerName.trim() : ''
  if (customerName.length < 1 || customerName.length > 100) return { ok: false, error: 'Tên khách từ 1 tới 100 ký tự' }
  const receiveMode = b.receiveMode === 'delivery' ? 'delivery' : b.receiveMode === 'pickup' ? 'pickup' : null
  if (!receiveMode) return { ok: false, error: 'Cách nhận hàng không hợp lệ' }
  const location = typeof b.location === 'string' ? b.location.trim().slice(0, 200) : ''
  if (receiveMode === 'delivery' && location.length === 0) {
    return { ok: false, error: 'Cần Vị trí giao khi chọn giao tận nơi' }
  }
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 500) : ''
  const slotDate = typeof b.slotDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.slotDate) ? b.slotDate : null
  if (!slotDate) return { ok: false, error: 'Ngày nhận không hợp lệ' }
  const slotPart: SlotPart | null = b.slotPart === 'morning' ? 'morning' : b.slotPart === 'afternoon' ? 'afternoon' : null
  if (!slotPart) return { ok: false, error: 'Khung nhận không hợp lệ' }
  const paymentMethod = b.paymentMethod === 'transfer' ? 'transfer' : b.paymentMethod === 'cash' ? 'cash' : null
  if (!paymentMethod) return { ok: false, error: 'Cách thanh toán không hợp lệ' }
  return {
    ok: true,
    order: { customerName, receiveMode, location, note, slotDate, slotPart, paymentMethod, items: [] },
  }
}

export function createOrder(
  order: Omit<IncomingOrder, 'items'> & { items: unknown },
  channel: Channel,
): { ok: true; id: number; total: number; lines: ResolvedLine[] } | { ok: false; error: string } {
  const resolved = resolveLines(order.items)
  if (!resolved.ok) return resolved
  if (!isSlotOpen(order.slotDate, order.slotPart)) {
    return { ok: false, error: 'Khung nhận hàng đã kín hoặc không còn nhận, chọn khung khác' }
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders(customer_name, channel, receive_mode, location, note, slot_date, slot_part,
      payment_method, status, total, created_at, updated_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
  `)
  const insertLine = db.prepare(`
    INSERT INTO order_items(order_id, item_id, name, option_summary, unit_price, qty)
    VALUES(?, ?, ?, ?, ?, ?)
  `)
  const touchCustomer = db.prepare('INSERT OR IGNORE INTO customers(name) VALUES(?)')
  const ts = nowIso()
  const id = tx(() => {
    const res = insertOrder.run(
      order.customerName, channel, order.receiveMode, order.location, order.note,
      order.slotDate, order.slotPart, order.paymentMethod, resolved.total, ts, ts,
    )
    const orderId = Number(res.lastInsertRowid)
    for (const l of resolved.lines) {
      insertLine.run(orderId, l.itemId, l.name, l.optionSummary, l.unitPrice, l.qty)
    }
    touchCustomer.run(order.customerName)
    return orderId
  })
  return { ok: true, id, total: resolved.total, lines: resolved.lines }
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
