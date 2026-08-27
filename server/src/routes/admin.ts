import type { FastifyInstance } from 'fastify'
import { allRows, db, getSettings, setSettings } from '../db.js'
import { COOKIE_NAME, isAdmin, passwordMatches, setSessionCookie } from '../auth.js'
import { deleteItem, insertItemFull, menuTree, replaceItemFull, validateItemPayload } from '../menu.js'
import {
  ALLOWED_TRANSITIONS,
  availableSlots,
  createOrder,
  loadOrder,
  loadOrderItems,
  orderCode,
  STATUS_LABEL,
  transferMemo,
  validateIncoming,
  vietQrUrl,
  type OrderRow,
  type OrderStatus,
} from '../orders.js'
import { notifyNewOrder, notifyStatusChanged } from '../teams/notify.js'
import { vnNow } from '../domain/slots.js'

async function orderPayload(o: OrderRow) {
  return {
    id: o.id,
    code: orderCode(o.id),
    customerName: o.customer_name,
    channel: o.channel,
    receiveMode: o.receive_mode,
    location: o.location,
    note: o.note,
    slotDate: o.slot_date,
    slotPart: o.slot_part,
    paymentMethod: o.payment_method,
    status: o.status,
    statusLabel: STATUS_LABEL[o.status],
    total: o.total,
    createdAt: o.created_at,
    teamsThread: o.teams_thread,
    items: loadOrderItems(o.id).map((i) => ({
      name: i.name,
      optionSummary: i.option_summary,
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

  app.get('/api/admin/orders', async (req, reply) => {
    const query = req.query as { date?: string }
    const date = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : vnNow().date
    const rows = allRows<OrderRow>(
      db.prepare('SELECT * FROM orders WHERE slot_date = ? ORDER BY slot_part, id'),
      date,
    )
    return { date, orders: await Promise.all(rows.map(orderPayload)) }
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
        ? vietQrUrl(created.total, transferMemo(created.id, checked.order.customerName))
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
        slotCapacity: s.slotCapacity,
        teamsTenantId: s.teamsTenantId,
        teamsAppId: s.teamsAppId,
        teamsAppSecret: s.teamsAppSecret ? '•••' : '',
        teamsServiceUrl: s.teamsServiceUrl,
        teamsConvId: s.teamsConvId,
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
    if (patch.slotCapacity != null && !/^\d+$/.test(patch.slotCapacity)) {
      return reply.code(400).send({ error: 'Giới hạn mỗi khung phải là số nguyên' })
    }
    setSettings(patch)
    return { ok: true }
  })

  // Danh bạ Khách: tên quen kèm mã người dùng Teams.
  interface CustomerRow { id: number; name: string; teams_id: string }
  app.get('/api/admin/customers', async () => ({
    customers: allRows<CustomerRow>(
      db.prepare('SELECT * FROM customers ORDER BY name COLLATE NOCASE'),
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
    db.prepare('INSERT INTO customers(name, teams_id) VALUES(?, ?) ON CONFLICT(name) DO UPDATE SET teams_id = excluded.teams_id').run(name, teamsId)
    return reply.code(201).send({ ok: true })
  })

  app.delete('/api/admin/customers/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'Mã không hợp lệ' })
    db.prepare('DELETE FROM customers WHERE id = ?').run(id)
    return { ok: true }
  })

  // Khung giờ cho form nhập hộ.
  app.get('/api/admin/slots', async () => ({ slots: availableSlots() }))
}
