import { db, getRow, getSettings } from '../db.js'
import { slotLabel } from '../domain/slots.js'
import { fmtVnd } from '../util.js'
import { loadOrder, loadOrderItems, orderCode, STATUS_LABEL, type OrderRow, type OrderItemRow } from '../orders.js'
import { botConfigFromSettings, sendOrderReply, sendOrderRoot, type Mention } from './bot.js'

function mentionFor(name: string): Mention[] {
  // Dòng danh bạ luôn có cột teams_id.
  const row = getRow<{ teams_id: string }>(db.prepare('SELECT teams_id FROM customers WHERE name = ?'), name)
  return row && row.teams_id ? [{ teamsId: row.teams_id, name }] : []
}

/** Nội dung tin gốc mở Luồng Đơn hàng trên Teams. */
export function orderRootText(o: OrderRow, items: OrderItemRow[]): string {
  const lines = items.map(
    (i) => `• ${i.name}${i.option_summary ? ` (${i.option_summary})` : ''} x${i.qty} • ${fmtVnd(i.unit_price * i.qty)}`,
  )
  const receive =
    o.receive_mode === 'delivery' ? `🛵 Giao tận nơi: ${o.location}` : '🏠 Nhận tại quán'
  const parts = [
    `🆕 Đơn ${orderCode(o.id)} • ${fmtVnd(o.total)}`,
    ...lines,
    `👤 ${o.customer_name}${o.channel === 'zalo' ? ' (đơn Zalo nhập hộ)' : ''}`,
    receive,
    `🕓 ${slotLabel(o.slot_date, o.slot_part)}`,
    `💳 ${o.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt khi nhận'}`,
  ]
  if (o.note) parts.push(`📝 ${o.note}`)
  return parts.join('\n')
}

/**
 * Mở Luồng Đơn hàng (tin gốc). Lỗi Teams không làm hỏng giao dịch đặt món:
 * đơn đã lưu, chỉ ghi log để chủ quán biết bot chưa thông báo được.
 */
export async function notifyNewOrder(orderId: number): Promise<void> {
  const cfg = botConfigFromSettings(getSettings())
  if (!cfg) return
  const order = loadOrder(orderId)
  if (!order) return
  const items = loadOrderItems(orderId)
  try {
    const rootId = await sendOrderRoot(cfg, orderRootText(order, items), mentionFor(order.customer_name))
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
  const text = `${STATUS_LABEL[order.status]} đơn ${orderCode(order.id)}`
  try {
    await sendOrderReply(cfg, order.teams_thread, text, mentionFor(order.customer_name))
  } catch (e) {
    console.error(`Teams: trả lời đơn ${orderCode(orderId)} thất bại:`, e)
  }
}
