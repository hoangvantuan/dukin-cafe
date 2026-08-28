import path from 'node:path'

/** Thư mục dữ liệu đã gắn ổ ngoài trong docker-compose.yml, sống qua mỗi lần dựng lại. */
const dataDir = process.env.DATA_DIR ?? path.resolve('data')

export const config = {
  port: Number(process.env.PORT ?? 8080),
  dataDir,
  /**
   * Ảnh Món nằm trong chính thư mục dữ liệu để đi cùng cơ sở dữ liệu, không
   * nằm lẫn với phần tĩnh của giao diện (phần đó bị ghi đè mỗi lần dựng lại).
   */
  imageDir: process.env.IMAGE_DIR ?? path.join(dataDir, 'anh-mon'),
  staticDir: process.env.STATIC_DIR ?? path.resolve('../web/dist'),
  adminPassword: process.env.ADMIN_PASSWORD ?? 'dukin',
  sessionSecret: process.env.SESSION_SECRET ?? 'dukin-dev-secret',
  teamsWebhookSecret: process.env.TEAMS_WEBHOOK_SECRET ?? '',
}

export type AppConfig = typeof config
