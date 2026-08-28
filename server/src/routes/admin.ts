import type { FastifyInstance } from 'fastify'
import { allRows, db, getRow, getSettings, setSettings, upsertCustomer, type CustomerRow } from '../db.js'
import { COOKIE_NAME, isAdmin, passwordMatches, setSessionCookie } from '../auth.js'
import { deleteItem, insertItemFull, menuTree, replaceItemFull, validateItemPayload } from '../menu.js'
import {
  ALLOWED_TRANSITIONS,
  createOrder,
  intakeToday,
  loadOrder,
  loadOrderItems,
  orderCode,
  STATUS_LABEL,
  transferMemo,
  lineOptionIds,
  orderSnapshot,
  updateOrder,
  validateIncoming,
  vietQrUrl,
  type OrderRow,
  type OrderStatus,
} from '../orders.js'
import { notifyNewOrder, notifyOrderEdited, notifyStatusChanged, parseRecipients, serializeRecipients } from '../teams/notify.js'
import { diffOrder } from '../domain/orderDiff.js'
import { botConfigFromSettings, listTeamMembers } from '../teams/bot.js'
import { vnNow } from '../domain/day.js'
import { isPeriod, summarize, type StatLine, type StatOrder } from '../domain/stats.js'
import { brewSheet, type BrewLine } from '../domain/brewSheet.js'

async function orderPayload(o: OrderRow) {
  return {
    id: o.id,
    code: orderCode(o.id),
    customerName: o.customer_name,
    channel: o.channel,
    receiveMode: o.receive_mode,
    location: o.location,
    note: o.note,
    orderDate: o.order_date,
    paymentMethod: o.payment_method,
    status: o.status,
    statusLabel: STATUS_LABEL[o.status],
    total: o.total,
    createdAt: o.created_at,
    teamsThread: o.teams_thread,
    items: loadOrderItems(o.id).map((i) => ({
      itemId: i.item_id,
      name: i.name,
      optionSummary: i.option_summary,
      optionIds: lineOptionIds(i),
      unitPrice: i.unit_price,
      qty: i.qty,
    })),
  }
}

/** Tuyến mở: đăng nhập, phiên. */
export async function adminAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/admin/login', async (req, reply) => {
    if (typeof req.body !== 'object' || req.body === null) return reply.code(400).send({ error: 'Thiếu mật khẩu' })
    const password = (req.body as Record<string, unknown>).password
    if (typeof password !== 'string' || !passwordMatches(password)) {
      return reply.code(401).send({ error: 'Mật khẩu chưa đúng' })
    }
    setSessionCookie(reply)
    return { ok: true }
  })

  app.get('/api/admin/session', async (req, reply) => {
    if (!isAdmin(req)) return reply.code(401).send({ error: 'Chưa đăng nhập' })
    return { ok: true }
  })
}

/** Tuyến khóa bằng cookie phiên. */
export async function adminApi(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (req, reply) => {
    if (!isAdmin(req)) return reply.code(401).send({ error: 'Chưa đăng nhập' })
  })

  app.post('/api/admin/logout', async (_req, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' })
    return { ok: true }
  })

  /**
   * Hai cách xem đơn:
   * - scope=pending (mặc định): mọi đơn chưa Hoàn tất và chưa Hủy, không phân
   *   theo ngày. Đây là hàng đợi việc của quán.
   * - scope=date: đơn đặt trong đúng một ngày, để đối sổ và xem doanh thu.
   */
  app.get('/api/admin/orders', async (req) => {
    const query = req.query as { date?: string; scope?: string }
    const date = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : vnNow().date
    const scope = query.scope === 'date' ? 'date' : 'pending'
    const rows =
      scope === 'date'
        ? allRows<OrderRow>(
            db.prepare('SELECT * FROM orders WHERE order_date = ? ORDER BY id DESC'),
            date,
          )
        : allRows<OrderRow>(
            db.prepare(
              "SELECT * FROM orders WHERE status NOT IN ('done','cancelled') ORDER BY id",
            ),
          )
    return { date, scope, orders: await Promise.all(rows.map(orderPayload)) }
  })

  /** Số đơn còn phải xử lý, cho huy hiệu trên thanh điều hướng. */
  app.get('/api/admin/orders/pending-count', async () => {
    const row = getRow<{ c: number }>(
      db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status NOT IN ('done','cancelled')"),
    )
    const fresh = getRow<{ c: number }>(
      db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'new'"),
    )
    return { pending: row?.c ?? 0, fresh: fresh?.c ?? 0 }
  })

  /** Nhập hộ đơn từ kênh Zalo. */
  app.post('/api/admin/orders', async (req, reply) => {
    const checked = validateIncoming(req.body)
    if (!checked.ok) return reply.code(400).send({ error: checked.error })
    const created = createOrder({ ...checked.order, items: (req.body as Record<string, unknown>).items }, 'zalo')
    if (!created.ok) return reply.code(400).send({ error: created.error })
    await notifyNewOrder(created.id)
    const qrUrl =
      checked.order.paymentMethod === 'transfer'
        ? vietQrUrl(created.total, transferMemo(created.id, created.customerName))
        : null
    return reply.code(201).send({ id: created.id, total: created.total, qrUrl })
  })

  app.patch('/api/admin/orders/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Mã đơn không hợp lệ' })
    if (typeof req.body !== 'object' || req.body === null) return reply.code(400).send({ error: 'Thiếu dữ liệu' })
    const status = (req.body as Record<string, unknown>).status
    const order = loadOrder(id)
    if (!order) return reply.code(404).send({ error: 'Không thấy đơn' })
    if (status !== order.status && (typeof status !== 'string' || !ALLOWED_TRANSITIONS[order.status].includes(status as OrderStatus))) {
      return reply.code(400).send({ error: `Không thể chuyển từ ${STATUS_LABEL[order.status]} sang trạng thái này` })
    }
    db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(
      String(status), new Date().toISOString(), id,
    )
    await notifyStatusChanged(id)
    const fresh = loadOrder(id)
    return fresh ? orderPayload(fresh) : reply.code(500).send({ error: 'Lỗi đọc lại đơn' })
  })

  /**
   * Chủ quán sửa nội dung đơn: đổi món, đổi cách nhận, đổi ghi chú.
   * Sửa xong bot trả lời vào đúng Luồng Đơn hàng, nêu rõ trước và sau.
   * Không đụng Trạng thái Đơn hàng: việc đó vẫn đi qua PATCH.
   */
  app.put('/api/admin/orders/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Mã đơn không hợp lệ' })
    const checked = validateIncoming(req.body)
    if (!checked.ok) return reply.code(400).send({ error: checked.error })

    const before = loadOrder(id)
    if (!before) return reply.code(404).send({ error: 'Không thấy đơn' })
    const beforeSnap = orderSnapshot(before, loadOrderItems(id))

    const done = updateOrder(id, checked.order, (req.body as Record<string, unknown>).items)
    if (!done.ok) return reply.code(done.code ?? 400).send({ error: done.error })

    const changes = diffOrder(beforeSnap, orderSnapshot(done.order, loadOrderItems(id)))
    await notifyOrderEdited(id, changes)
    return { ...(await orderPayload(done.order)), changes }
  })

  app.get('/api/admin/menu', async () => ({ items: menuTree(true) }))

  app.post('/api/admin/menu', async (req, reply) => {
    const checked = validateItemPayload((req.body as Record<string, unknown>)?.item ?? req.body)
    if (!checked.ok) return reply.code(400).send({ error: checked.error })
    const id = insertItemFull(checked.payload)
    return reply.code(201).send({ id })
  })

  app.put('/api/admin/menu/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Mã món không hợp lệ' })
    const checked = validateItemPayload((req.body as Record<string, unknown>)?.item ?? req.body)
    if (!checked.ok) return reply.code(400).send({ error: checked.error })
    if (!replaceItemFull(id, checked.payload)) return reply.code(404).send({ error: 'Không thấy món' })
    return { ok: true }
  })

  app.delete('/api/admin/menu/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Mã món không hợp lệ' })
    if (!deleteItem(id)) return reply.code(404).send({ error: 'Không thấy món' })
    return { ok: true }
  })

  app.get('/api/admin/settings', async () => {
    const s = getSettings()
    return {
      settings: {
        bankCode: s.bankCode,
        accountNo: s.accountNo,
        accountName: s.accountName,
        zaloLink: s.zaloLink,
        dailyCapacity: s.dailyCapacity,
        teamsTenantId: s.teamsTenantId,
        teamsAppId: s.teamsAppId,
        teamsAppSecret: s.teamsAppSecret ? '•••' : '',
        teamsServiceUrl: s.teamsServiceUrl,
        teamsConvId: s.teamsConvId,
        notifyRecipients: serializeRecipients(parseRecipients(s.notifyRecipients)),
        notifyCustomerOnNew: s.notifyCustomerOnNew === '1' ? '1' : '0',
      },
    }
  })

  app.put('/api/admin/settings', async (req, reply) => {
    if (typeof req.body !== 'object' || req.body === null) return reply.code(400).send({ error: 'Thiếu dữ liệu' })
    const body = req.body as Record<string, unknown>
    const incoming = (typeof body.settings === 'object' && body.settings !== null ? body.settings : body) as Record<string, unknown>
    const patch: Record<string, string> = {}
    for (const [k, v] of Object.entries(incoming)) {
      if (k === 'teamsAppSecret' && v === '•••') continue
      if (typeof v === 'string') patch[k] = v
    }
    if (patch.dailyCapacity != null && !/^\d+$/.test(patch.dailyCapacity)) {
      return reply.code(400).send({ error: 'Giới hạn đơn mỗi ngày phải là số nguyên' })
    }
    if (patch.notifyRecipients != null) {
      // Chuẩn hóa lại danh sách: bỏ dòng thiếu tên hoặc thiếu mã Teams.
      const list = parseRecipients(patch.notifyRecipients)
      if (list.length > 20) return reply.code(400).send({ error: 'Tối đa 20 người nhận thông báo' })
      patch.notifyRecipients = serializeRecipients(list)
    }
    if (patch.notifyCustomerOnNew != null) {
      patch.notifyCustomerOnNew = patch.notifyCustomerOnNew === '1' ? '1' : '0'
    }
    setSettings(patch)
    return { ok: true }
  })

  // Danh bạ Khách: tên quen kèm mã người dùng Teams. Tên là duy nhất, không
  // phân biệt hoa thường, nên cùng một người chỉ có đúng một dòng.
  app.get('/api/admin/customers', async () => ({
    customers: allRows<CustomerRow>(
      db.prepare('SELECT id, name, teams_id, name_key FROM customers ORDER BY name_key'),
    ).map((c) => ({
      id: c.id,
      name: c.name,
      teamsId: c.teams_id,
    })),
  }))
  app.post('/api/admin/customers', async (req, reply) => {
    if (typeof req.body !== 'object' || req.body === null) return reply.code(400).send({ error: 'Thiếu dữ liệu' })
    const b = req.body as Record<string, unknown>
    const name = typeof b.name === 'string' ? b.name.trim().slice(0, 100) : ''
    const teamsId = typeof b.teamsId === 'string' ? b.teamsId.trim().slice(0, 200) : ''
    if (!name) return reply.code(400).send({ error: 'Cần tên khách' })
    upsertCustomer(name, teamsId)
    return reply.code(201).send({ ok: true })
  })

  app.delete('/api/admin/customers/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Mã không hợp lệ' })
    db.prepare('DELETE FROM customers WHERE id = ?').run(id)
    return { ok: true }
  })

  /**
   * Doanh thu và tình trạng đặt đơn, gộp theo ngày, tuần, tháng hoặc năm.
   * Việc gộp là hàm thuần ở tầng miền; tuyến này chỉ đọc dữ liệu rồi giao cho nó.
   */
  app.get('/api/admin/stats', async (req, reply) => {
    const query = req.query as { period?: string; span?: string }
    const period = isPeriod(query.period) ? query.period : 'day'
    const span = query.span && /^\d{1,3}$/.test(query.span) ? Number(query.span) : undefined
    if (span !== undefined && (span < 1 || span > 120)) {
      return reply.code(400).send({ error: 'Số kỳ hiển thị từ 1 tới 120' })
    }
    const orders = allRows<StatOrder>(
      db.prepare(`
        SELECT order_date AS orderDate, status, total, channel,
               receive_mode AS receiveMode, payment_method AS paymentMethod,
               customer_key AS customerKey, customer_name AS customerName
        FROM orders
      `),
    )
    const lines = allRows<StatLine>(
      db.prepare(`
        SELECT o.order_date AS orderDate, o.status, i.name,
               i.option_summary AS optionSummary, i.qty, i.unit_price AS unitPrice
        FROM order_items i JOIN orders o ON o.id = i.order_id
      `),
    )
    return summarize({ orders, lines, period, today: vnNow().date, span })
  })

  /**
   * Bảng pha chế: gộp Hàng đợi xử lý theo cặp Món và Tùy chọn để chủ quán biết
   * phải pha bao nhiêu ly mỗi loại. Việc gộp là hàm thuần ở tầng miền; tuyến
   * này chỉ đọc dữ liệu rồi giao cho nó, giao diện không tự cộng lại.
   */
  app.get('/api/admin/brew-sheet', async () => {
    const lines = allRows<BrewLine>(
      db.prepare(`
        SELECT o.status, i.name, i.option_summary AS optionSummary, i.qty
        FROM order_items i JOIN orders o ON o.id = i.order_id
      `),
    )
    return brewSheet(lines)
  })

  /** Tình hình nhận đơn hôm nay, cho form nhập hộ biết còn chỗ hay không. */
  app.get('/api/admin/intake', async () => intakeToday())

  /**
   * Danh sách đồng nghiệp trong nhóm Teams, để chủ quán bấm chọn thay vì tự đi
   * tìm mã 29:... Teams chỉ gắn thẻ được bằng mã này, không nhận email.
   */
  app.get('/api/admin/teams/members', async (_req, reply) => {
    const cfg = botConfigFromSettings(getSettings())
    if (!cfg) {
      return reply.code(400).send({
        error: 'Chưa cấu hình xong Bot Teams. Điền Tenant ID, App ID, App Secret và cài bot vào nhóm trước.',
      })
    }
    try {
      const members = await listTeamMembers(cfg)
      return { members: members.sort((a, b) => a.name.localeCompare(b.name, 'vi')) }
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      return reply.code(502).send({ error: `Không đọc được danh sách nhóm Teams. ${detail}` })
    }
  })
}
