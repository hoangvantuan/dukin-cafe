import type { FastifyInstance } from 'fastify'
import { getSettings } from '../db.js'
import { menuTree } from '../menu.js'
import {
  availableSlots,
  createOrder,
  transferMemo,
  validateIncoming,
  vietQrUrl,
} from '../orders.js'
import { notifyNewOrder } from '../teams/notify.js'

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/menu', async () => ({ items: menuTree(false) }))

  app.get('/api/slots', async () => ({ slots: availableSlots() }))

  app.get('/api/public-config', async () => ({ zaloLink: getSettings().zaloLink }))

  app.post('/api/orders', async (req, reply) => {
    const body = req.body as Record<string, unknown>
    const checked = validateIncoming(body)
    if (!checked.ok) return reply.code(400).send({ error: checked.error })
    const created = createOrder({ ...checked.order, items: body.items }, 'web')
    if (!created.ok) return reply.code(400).send({ error: created.error })

    await notifyNewOrder(created.id)

    const qrUrl =
      checked.order.paymentMethod === 'transfer'
        ? vietQrUrl(created.total, transferMemo(created.id, checked.order.customerName))
        : null
    return reply.code(201).send({ id: created.id, total: created.total, qrUrl })
  })
}
