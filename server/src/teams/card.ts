/**
 * Dựng Adaptive Card cho Luồng Đơn hàng trên Teams.
 * Teams gắn thẻ người trong card qua msteams.entities, không qua entities của
 * activity như tin nhắn chữ thường: xem sendMessage trong bot.ts.
 */
import { fmtDateShort, vnClock, vnDate } from '../domain/day.js'
import { fmtVnd } from '../util.js'
import { orderCode, STATUS_LABEL, type OrderItemRow, type OrderRow } from '../orders.js'
import type { Mention } from './bot.js'

const SCHEMA = 'http://adaptivecards.io/schemas/adaptive-card.json'
const VERSION = '1.4'

/** Màu nhấn theo Trạng thái Đơn hàng, dùng cho dòng tiêu đề của thẻ. */
const STATUS_COLOR: Record<OrderRow['status'], string> = {
  new: 'accent',
  confirmed: 'accent',
  paid: 'good',
  done: 'good',
  cancelled: 'attention',
}

type Block = Record<string, unknown>

function textBlock(text: string, extra: Block = {}): Block {
  return { type: 'TextBlock', text, wrap: true, ...extra }
}

/** Một dòng món: tên kèm Tùy chọn bên trái, thành tiền canh phải. */
function itemRow(i: OrderItemRow): Block {
  const label = `${i.name}${i.option_summary ? ` _(${i.option_summary})_` : ''} × ${i.qty}`
  return {
    type: 'ColumnSet',
    spacing: 'Small',
    columns: [
      { type: 'Column', width: 'stretch', items: [textBlock(label, { size: 'Small' })] },
      {
        type: 'Column',
        width: 'auto',
        items: [textBlock(fmtVnd(i.unit_price * i.qty), { size: 'Small', horizontalAlignment: 'Right' })],
      },
    ],
  }
}

/** Ghép phần gắn thẻ vào cuối thẻ; trả về thẻ đã kèm msteams.entities. */
function withMentions(card: Block, mentions: Mention[], lead: string): Block {
  if (mentions.length === 0) return card
  const body = card.body as Block[]
  body.push(
    textBlock(`${lead} ${mentions.map((m) => `<at>${m.name}</at>`).join(' ')}`, {
      size: 'Small',
      isSubtle: true,
      separator: true,
    }),
  )
  return {
    ...card,
    msteams: {
      entities: mentions.map((m) => ({
        type: 'mention',
        text: `<at>${m.name}</at>`,
        mentioned: { id: m.teamsId, name: m.name },
      })),
    },
  }
}

/** Thẻ mở Luồng Đơn hàng: đủ thông tin để pha chế và giao hàng. */
export function orderCard(o: OrderRow, items: OrderItemRow[], mentions: Mention[]): Block {
  const facts = [
    { title: 'Khách', value: `**${o.customer_name}**${o.channel === 'zalo' ? ' _(Zalo nhập hộ)_' : ''}` },
    {
      title: 'Nhận hàng',
      value: o.receive_mode === 'delivery' ? `🛵 Giao tận nơi · ${o.location}` : '🏠 Nhận tại quán',
    },
    { title: 'Đặt lúc', value: `🕓 ${vnClock(o.created_at)} ngày ${fmtDateShort(vnDate(o.created_at))}` },
    {
      title: 'Thanh toán',
      value: o.payment_method === 'transfer' ? '💳 Chuyển khoản' : '💵 Tiền mặt khi nhận',
    },
  ]
  if (o.note) facts.push({ title: 'Ghi chú', value: `📝 ${o.note}` })

  const card: Block = {
    $schema: SCHEMA,
    type: 'AdaptiveCard',
    version: VERSION,
    body: [
      {
        type: 'Container',
        style: 'emphasis',
        bleed: true,
        items: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  textBlock('☕ ĐƠN MỚI · DUKIN Cafe', { size: 'Small', weight: 'Bolder', isSubtle: true }),
                  textBlock(`Đơn ${orderCode(o.id)}`, { size: 'Large', weight: 'Bolder', spacing: 'None' }),
                ],
              },
              {
                type: 'Column',
                width: 'auto',
                verticalContentAlignment: 'Center',
                items: [
                  textBlock(fmtVnd(o.total), {
                    size: 'Large',
                    weight: 'Bolder',
                    color: STATUS_COLOR[o.status],
                    horizontalAlignment: 'Right',
                  }),
                ],
              },
            ],
          },
        ],
      },
      ...items.map(itemRow),
      { type: 'FactSet', separator: true, facts },
    ],
  }
  return withMentions(card, mentions, '🔔')
}

/** Thẻ trả lời trong Luồng Đơn hàng khi đổi Trạng thái Đơn hàng. */
export function statusCard(o: OrderRow, mentions: Mention[]): Block {
  const card: Block = {
    $schema: SCHEMA,
    type: 'AdaptiveCard',
    version: VERSION,
    body: [
      {
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'stretch',
            items: [
              textBlock(`${STATUS_LABEL[o.status]} · Đơn ${orderCode(o.id)}`, {
                weight: 'Bolder',
                color: STATUS_COLOR[o.status],
              }),
              textBlock(`${o.customer_name} · đặt lúc ${vnClock(o.created_at)} ngày ${fmtDateShort(vnDate(o.created_at))}`, {
                size: 'Small',
                isSubtle: true,
                spacing: 'None',
              }),
            ],
          },
          {
            type: 'Column',
            width: 'auto',
            verticalContentAlignment: 'Center',
            items: [textBlock(fmtVnd(o.total), { weight: 'Bolder', horizontalAlignment: 'Right' })],
          },
        ],
      },
    ],
  }
  return withMentions(card, mentions, '🔔')
}
