import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { getSettings, setSettings } from '../db.js'
import { botConfigFromSettings, getBotToken } from '../teams/bot.js'

/**
 * Điểm nhận sự kiện Bot Framework. Khi bot được cài vào nhóm, Teams gửi
 * conversationUpdate: lấy mã hội thoại kênh General lưu vào cấu hình.
 * Đường dẫn messaging endpoint trên Azure đặt là:
 *   https://<tên miền>/api/teams/events?secret=<TEAMS_WEBHOOK_SECRET>
 */
export async function teamsEvents(app: FastifyInstance): Promise<void> {
  app.post('/api/teams/events', async (req, reply) => {
    if (config.teamsWebhookSecret) {
      const query = req.query as { secret?: string }
      if (query.secret !== config.teamsWebhookSecret) return reply.code(401).send({ error: 'Sai khóa' })
    }

    const body = req.body as {
      type?: string
      serviceUrl?: string
      recipient?: { id?: string }
      membersAdded?: Array<{ id?: string }>
      channelData?: { team?: { id?: string } }
    }

    const botId = body.recipient?.id
    const addedSelf = (body.membersAdded ?? []).some((m) => m.id && m.id === botId)
    const teamId = body.channelData?.team?.id
    const serviceUrl = body.serviceUrl

    if (body.type === 'conversationUpdate' && addedSelf && teamId && serviceUrl?.startsWith('https://')) {
      const cfg = botConfigFromSettings(getSettings(), { allowMissingConvId: true })
      if (cfg) {
        try {
          const token = await getBotToken(cfg)
          const res = await fetch(`${serviceUrl}v3/teams/${teamId}/conversations`, {
            headers: { authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(8000),
          })
          if (res.ok) {
            const data = (await res.json()) as { conversations?: Array<{ id: string; name?: string }> }
            // Kênh General là nơi bắn Luồng Đơn hàng.
            const general =
              data.conversations?.find((c) => c.name === 'General') ?? data.conversations?.[0]
            if (general) {
              setSettings({ teamsConvId: general.id, teamsServiceUrl: serviceUrl })
            }
          } else {
            console.error(`Teams: liệt kê kênh thất bại ${res.status}`)
          }
        } catch (e) {
          console.error('Teams: xử lý sự kiện cài bot thất bại:', e)
        }
      }
    }
    // Bot Framework yêu cầu trả 200 nhanh, không quan tâm nội dung.
    return reply.code(200).send()
  })
}
