import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import { existsSync } from 'node:fs'
import { config } from './config.js'
import { publicRoutes } from './routes/public.js'
import { adminApi, adminAuthRoutes } from './routes/admin.js'
import { teamsEvents } from './routes/teams.js'

const app = Fastify({ logger: { level: 'warn' } })

await app.register(cookie)
await app.register(publicRoutes)
await app.register(adminAuthRoutes)
await app.register(adminApi)
await app.register(teamsEvents)

if (existsSync(config.staticDir)) {
  await app.register(fastifyStatic, { root: config.staticDir, wildcard: false })
  // SPA: mọi đường không phải API trả index.html để /dat-hang và /quan-tri chạy trực tiếp.
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Không tìm thấy' })
    return reply.sendFile('index.html')
  })
} else {
  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: 'Không tìm thấy' }))
}

app.listen({ port: config.port, host: '0.0.0.0' }).catch((e) => {
  app.log.error(e)
  process.exit(1)
})
