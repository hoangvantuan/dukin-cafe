import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import { existsSync, mkdirSync } from 'node:fs'
import { config } from './config.js'
import { IMAGE_URL_PREFIX } from './menu.js'
import { publicRoutes } from './routes/public.js'
import { adminApi, adminAuthRoutes } from './routes/admin.js'
import { teamsEvents } from './routes/teams.js'

/** Dựng ứng dụng, tách khỏi việc mở cổng để test gọi thẳng bằng app.inject. */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: 'warn' } })

  await app.register(cookie)

  // Ảnh Món nằm trong thư mục dữ liệu đã gắn ổ ngoài nên sống qua mỗi lần dựng
  // lại container, khác với phần tĩnh của giao diện vốn bị ghi đè. Phát ra ở
  // tiền tố riêng, không trang trí lại reply vì phần tĩnh phía dưới đã làm.
  mkdirSync(config.imageDir, { recursive: true })
  await app.register(fastifyStatic, {
    root: config.imageDir,
    prefix: IMAGE_URL_PREFIX,
    decorateReply: false,
  })

  await app.register(publicRoutes)
  await app.register(adminAuthRoutes)
  await app.register(adminApi)
  await app.register(teamsEvents)

  if (existsSync(config.staticDir)) {
    await app.register(fastifyStatic, { root: config.staticDir, wildcard: false })
    // SPA: mọi đường không phải API trả index.html để /dat-hang và /quan-tri chạy trực tiếp.
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/') || req.url.startsWith(IMAGE_URL_PREFIX)) {
        return reply.code(404).send({ error: 'Không tìm thấy' })
      }
      return reply.sendFile('index.html')
    })
  } else {
    app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: 'Không tìm thấy' }))
  }
  return app
}
