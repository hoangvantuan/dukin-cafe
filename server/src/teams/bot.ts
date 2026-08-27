/**
 * Gửi tin qua Bot Framework thay quán (Bot DUKIN).
 * Webhook Teams không trả lời được vào luồng, Graph tự chủ không gửi được tin
 * kênh thông thường, nên dùng bot: xem docs/adr/0002.
 */

export interface BotConfig {
  tenantId: string
  appId: string
  appSecret: string
  serviceUrl: string
  convId: string
}

export function botConfigFromSettings(
  s: Record<string, string>,
  opts: { allowMissingConvId?: boolean } = {},
): BotConfig | null {
  if (!s.teamsTenantId || !s.teamsAppId || !s.teamsAppSecret) return null
  if (!s.teamsConvId && !opts.allowMissingConvId) return null
  const serviceUrl = s.teamsServiceUrl || 'https://smba.trafficmanager.net/teams/'
  return {
    tenantId: s.teamsTenantId,
    appId: s.teamsAppId,
    appSecret: s.teamsAppSecret,
    serviceUrl,
    convId: s.teamsConvId,
  }
}

let tokenCache: { token: string; expiresAt: number } | null = null

export async function getBotToken(cfg: BotConfig): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    scope: 'https://api.botframework.com/.default',
  })
  const res = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Lấy mã bot thất bại: ${res.status}`)
  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new Error('Phản hồi mã bot thiếu access_token')
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in ?? 3600) - 120) * 1000,
  }
  return data.access_token
}

export interface Mention {
  /** Mã người dùng Teams dạng 8:orgid:... */
  teamsId: string
  name: string
}

export async function sendActivity(
  cfg: BotConfig,
  conversationId: string,
  text: string,
  mentions: Mention[] = [],
): Promise<string | null> {
  const token = await getBotToken(cfg)
  const activity: Record<string, unknown> = { type: 'message', text }
  if (mentions.length > 0) {
    activity.entities = mentions.map((m) => ({
      type: 'mention',
      mentioned: { id: m.teamsId, name: m.name },
      text: `<at>${m.name}</at>`,
    }))
  }
  const res = await fetch(`${cfg.serviceUrl}v3/conversations/${conversationId}/activities`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(activity),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Gửi Teams thất bại: ${res.status} ${await res.text().catch(() => '')}`)
  const data = (await res.json().catch(() => null)) as { id?: string } | null
  return data?.id ?? null
}

/** Mở Luồng Đơn hàng: tin gốc trong kênh, trả về mã tin nhắn gốc. */
export async function sendOrderRoot(cfg: BotConfig, text: string, mentions: Mention[]): Promise<string | null> {
  return sendActivity(cfg, cfg.convId, text, mentions)
}

/** Trả lời vào đúng Luồng Đơn hàng khi đổi Trạng thái Đơn hàng. */
export async function sendOrderReply(
  cfg: BotConfig,
  rootMessageId: string,
  text: string,
  mentions: Mention[],
): Promise<void> {
  await sendActivity(cfg, `${cfg.convId};messageid=${rootMessageId}`, text, mentions)
}
