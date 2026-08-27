import path from 'node:path'

export const config = {
  port: Number(process.env.PORT ?? 8080),
  dataDir: process.env.DATA_DIR ?? path.resolve('data'),
  staticDir: process.env.STATIC_DIR ?? path.resolve('../web/dist'),
  adminPassword: process.env.ADMIN_PASSWORD ?? 'dukin',
  sessionSecret: process.env.SESSION_SECRET ?? 'dukin-dev-secret',
  teamsWebhookSecret: process.env.TEAMS_WEBHOOK_SECRET ?? '',
}

export type AppConfig = typeof config
