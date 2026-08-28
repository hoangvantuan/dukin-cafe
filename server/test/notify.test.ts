import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dukin-notify-'))
process.env.DATA_DIR = dataDir

const { db, setSettings, upsertCustomer } = await import('../src/db.js')
const { notifyNewOrder, notifyStatusChanged, notifyOrderEdited } = await import('../src/teams/notify.js')
const { nowIso } = await import('../src/util.js')

test.after(() => fs.rmSync(dataDir, { recursive: true, force: true }))

setSettings({
  teamsTenantId: 'tenant',
  teamsAppId: 'app',
  teamsAppSecret: 'secret',
  teamsConvId: '19:kenh@thread.tacv2',
  teamsServiceUrl: 'https://smba.trafficmanager.net/teams/',
  notifyRecipients: JSON.stringify([{ name: 'Bếp DUKIN', teamsId: '29:bep' }]),
  notifyCustomerOnNew: '1',
})
upsertCustomer('Hoàng Tuấn', '29:tuan')

function makeOrder(customerName: string): number {
  const ts = nowIso()
  const id = Number(
    db
      .prepare(`
        INSERT INTO orders(customer_name, channel, receive_mode, location, note, order_date,
          payment_method, status, total, created_at, updated_at)
        VALUES(?, 'web', 'delivery', 'Tầng 4', 'Ít đá', '2026-08-28', 'transfer', 'new', 70000, ?, ?)
      `)
      .run(customerName, ts, ts).lastInsertRowid,
  )
  db.prepare(`
    INSERT INTO order_items(order_id, item_id, name, option_summary, unit_price, qty)
    VALUES(?, 1, 'D. Muối Kem Béo', 'Lớn', 35000, 2)
  `).run(id)
  return id
}

interface Sent {
  url: string
  activity: {
    type: string
    summary?: string
    attachments?: Array<{ contentType: string; content: Record<string, unknown> }>
  }
}

/** Thay fetch để bắt đúng thân yêu cầu bot gửi lên Bot Framework. */
function captureFetch(): { sent: Sent[]; restore: () => void } {
  const sent: Sent[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('login.microsoftonline.com')) {
      return new Response(JSON.stringify({ access_token: 'ma-gia', expires_in: 3600 }), {
        headers: { 'content-type': 'application/json' },
      })
    }
    sent.push({ url, activity: JSON.parse(String(init?.body)) })
    return new Response(JSON.stringify({ id: 'msg-goc' }), {
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof globalThis.fetch
  return { sent, restore: () => { globalThis.fetch = original } }
}

test('tin đơn mới là thẻ, gắn thẻ người phụ trách và Khách đã liên kết Teams', async () => {
  const { sent, restore } = captureFetch()
  const id = makeOrder('Hoàng Tuấn')
  try {
    await notifyNewOrder(id)
  } finally {
    restore()
  }

  assert.equal(sent.length, 1)
  assert.ok(sent[0].url.endsWith('/v3/conversations/19:kenh@thread.tacv2/activities'))
  const att = sent[0].activity.attachments?.[0]
  assert.equal(att?.contentType, 'application/vnd.microsoft.card.adaptive')

  const card = att!.content as {
    type: string
    version: string
    body: unknown[]
    msteams?: { entities: Array<{ text: string; mentioned: { id: string; name: string } }> }
  }
  assert.equal(card.type, 'AdaptiveCard')
  assert.equal(card.version, '1.4')

  const ids = card.msteams?.entities.map((e) => e.mentioned.id) ?? []
  assert.deepEqual(ids, ['29:bep', '29:tuan'], 'người phụ trách trước, Khách sau')
  for (const e of card.msteams!.entities) {
    assert.equal(e.text, `<at>${e.mentioned.name}</at>`, 'thẻ gắn tên phải khớp entity')
  }

  const flat = JSON.stringify(card)
  assert.ok(flat.includes('D. Muối Kem Béo'), 'thẻ liệt kê món')
  assert.ok(flat.includes('70.000đ'), 'thẻ ghi tổng tiền')
  assert.ok(flat.includes('Tầng 4'), 'thẻ ghi vị trí giao')
  assert.ok(flat.includes('Ít đá'), 'thẻ ghi ghi chú')
  assert.ok(sent[0].activity.summary?.includes('Đơn mới'))

  // Mã tin gốc được lưu để các cập nhật trạng thái trả lời đúng luồng.
  const row = db.prepare('SELECT teams_thread FROM orders WHERE id = ?').get(id) as {
    teams_thread: string
  }
  assert.equal(row.teams_thread, 'msg-goc')
})

test('tắt nhắc Khách thì chỉ còn người phụ trách được gắn thẻ', async () => {
  setSettings({ notifyCustomerOnNew: '0' })
  const { sent, restore } = captureFetch()
  try {
    await notifyNewOrder(makeOrder('Hoàng Tuấn'))
  } finally {
    restore()
    setSettings({ notifyCustomerOnNew: '1' })
  }
  const card = sent[0].activity.attachments![0].content as {
    msteams?: { entities: Array<{ mentioned: { id: string } }> }
  }
  assert.deepEqual(card.msteams?.entities.map((e) => e.mentioned.id), ['29:bep'])
})

test('Khách gõ khác hoa thường vẫn được gắn thẻ đúng người', async () => {
  const { sent, restore } = captureFetch()
  try {
    await notifyNewOrder(makeOrder('HOÀNG   TUẤN'))
  } finally {
    restore()
  }
  const card = sent[0].activity.attachments![0].content as {
    msteams?: { entities: Array<{ mentioned: { id: string; name: string } }> }
  }
  const tuan = card.msteams?.entities.find((e) => e.mentioned.id === '29:tuan')
  assert.ok(tuan, 'phải tra ra Khách dù tên gõ khác hoa thường')
  assert.equal(tuan.mentioned.name, 'Hoàng Tuấn', 'gắn thẻ bằng tên chuẩn trong Danh bạ')
})

test('đổi trạng thái trả lời vào đúng luồng đơn bằng thẻ gọn', async () => {
  const id = makeOrder('Hoàng Tuấn')
  db.prepare("UPDATE orders SET teams_thread = 'msg-goc', status = 'done' WHERE id = ?").run(id)
  const { sent, restore } = captureFetch()
  try {
    await notifyStatusChanged(id)
  } finally {
    restore()
  }
  assert.ok(sent[0].url.includes('19:kenh@thread.tacv2;messageid=msg-goc'))
  const card = sent[0].activity.attachments![0].content as { body: unknown[] }
  assert.ok(JSON.stringify(card).includes('Hoàn tất'))
})

test('Teams lỗi thì đơn vẫn còn, chỉ không có luồng', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async () => new Response('loi', { status: 500 })) as typeof globalThis.fetch
  const id = makeOrder('Hoàng Tuấn')
  try {
    await notifyNewOrder(id)
  } finally {
    globalThis.fetch = original
  }
  const row = db.prepare('SELECT teams_thread FROM orders WHERE id = ?').get(id) as {
    teams_thread: string
  }
  assert.equal(row.teams_thread, '', 'không có luồng nhưng đơn không mất')
})

test('sửa đơn thì bot trả lời vào đúng luồng, nêu cả trước và sau', async () => {
  const id = makeOrder('Hoàng Tuấn')
  db.prepare("UPDATE orders SET teams_thread = 'msg-goc' WHERE id = ?").run(id)
  const { sent, restore } = captureFetch()
  try {
    await notifyOrderEdited(id, [
      { label: 'Món', before: 'Đen (Vừa) × 2', after: 'Muối Kem (Lớn) × 1' },
      { label: 'Tổng tiền', before: '40.000đ', after: '55.000đ' },
    ])
  } finally {
    restore()
  }
  assert.equal(sent.length, 1)
  assert.ok(sent[0].url.includes(';messageid=msg-goc'), 'phải trả lời trong luồng của đơn')

  const card = sent[0].activity.attachments![0].content as {
    msteams?: { entities: Array<{ mentioned: { id: string } }> }
  }
  const flat = JSON.stringify(card)
  assert.ok(flat.includes('Đã sửa đơn'))
  assert.ok(flat.includes('Đen (Vừa) × 2'), 'nội dung trước khi sửa')
  assert.ok(flat.includes('Muối Kem (Lớn) × 1'), 'nội dung sau khi sửa')
  assert.ok(flat.includes('40.000đ') && flat.includes('55.000đ'))
  assert.ok(sent[0].activity.summary?.includes('món, tổng tiền'), 'tóm tắt nêu mục đã đổi')
  assert.deepEqual(card.msteams?.entities.map((e) => e.mentioned.id), ['29:bep', '29:tuan'])
})

test('không có gì đổi thì không làm phiền nhóm', async () => {
  const id = makeOrder('Hoàng Tuấn')
  db.prepare("UPDATE orders SET teams_thread = 'msg-goc' WHERE id = ?").run(id)
  const { sent, restore } = captureFetch()
  try {
    await notifyOrderEdited(id, [])
  } finally {
    restore()
  }
  assert.equal(sent.length, 0)
})

test('đơn chưa có luồng Teams thì bỏ qua, không lỗi', async () => {
  const id = makeOrder('Hoàng Tuấn')
  const { sent, restore } = captureFetch()
  try {
    await notifyOrderEdited(id, [{ label: 'Ghi chú', before: '(không có)', after: 'Ít đá' }])
  } finally {
    restore()
  }
  assert.equal(sent.length, 0)
})
