import { db, findCustomer, getSettings } from '../db.js'
import { fmtVnd, nameKey } from '../util.js'
import { loadOrder, loadOrderItems, orderCode, STATUS_LABEL } from '../orders.js'
import { botConfigFromSettings, sendOrderReply, sendOrderRoot, type Mention } from './bot.js'
import { orderCard, statusCard } from './card.js'

/**
 * Người phụ trách được nhắc khi có đơn mới, lấy từ Cài đặt.
 * Lưu dạng JSON để chủ quán sửa được qua Trang quản lý mà không cần đụng bảng.
 */
export function parseRecipients(raw: string): Mention[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw || '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const out: Mention[] = []
  for (const r of parsed) {
    if (typeof r !== 'object' || r === null) continue
    const o = r as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name.trim() : ''
    const teamsId = typeof o.teamsId === 'string' ? o.teamsId.trim() : ''
    if (name && teamsId) out.push({ name, teamsId })
  }
  return out
}

export function serializeRecipients(list: Mention[]): string {
  return JSON.stringify(list.map((m) => ({ name: m.name, teamsId: m.teamsId })))
}

/** Gắn thẻ Khách nếu Khách đã liên kết Teams trong Danh bạ. */
function customerMention(name: string): Mention[] {
  const c = findCustomer(name)
  return c && c.teams_id ? [{ teamsId: c.teams_id, name: c.name }] : []
}

/** Bỏ trùng theo mã Teams, giữ thứ tự: người phụ trách trước, Khách sau. */
function dedupe(list: Mention[]): Mention[] {
  const seen = new Set<string>()
  const out: Mention[] = []
  for (const m of list) {
    const key = nameKey(m.teamsId)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(m)
  }
  return out
}

/**
 * Mở Luồng Đơn hàng (tin gốc). Lỗi Teams không làm hỏng giao dịch đặt món:
 * đơn đã lưu, chỉ ghi log để chủ quán biết bot chưa thông báo được.
 */
export async function notifyNewOrder(orderId: number): Promise<void> {
  const settings = getSettings()
  const cfg = botConfigFromSettings(settings)
  if (!cfg) return
  const order = loadOrder(orderId)
  if (!order) return
  const items = loadOrderItems(orderId)

  const mentions = dedupe([
    ...parseRecipients(settings.notifyRecipients),
    ...(settings.notifyCustomerOnNew === '1' ? customerMention(order.customer_name) : []),
  ])

  try {
    const rootId = await sendOrderRoot(cfg, {
      card: orderCard(order, items, mentions),
      summary: `Đơn mới ${orderCode(order.id)} · ${order.customer_name} · ${fmtVnd(order.total)}`,
    })
    if (rootId) db.prepare('UPDATE orders SET teams_thread = ? WHERE id = ?').run(rootId, orderId)
  } catch (e) {
    console.error(`Teams: gửi tin gốc đơn ${orderCode(orderId)} thất bại:`, e)
  }
}

/** Trả lời trạng thái vào đúng Luồng Đơn hàng, nhắc Khách nếu có trong Danh bạ. */
export async function notifyStatusChanged(orderId: number): Promise<void> {
  const cfg = botConfigFromSettings(getSettings())
  const order = loadOrder(orderId)
  if (!cfg || !order || !order.teams_thread) return
  const mentions = customerMention(order.customer_name)
  try {
    await sendOrderReply(cfg, order.teams_thread, {
      card: statusCard(order, mentions),
      summary: `${STATUS_LABEL[order.status]} · Đơn ${orderCode(order.id)}`,
    })
  } catch (e) {
    console.error(`Teams: trả lời đơn ${orderCode(orderId)} thất bại:`, e)
  }
}
