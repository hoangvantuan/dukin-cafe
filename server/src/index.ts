import { config } from './config.js'
import { buildApp } from './app.js'

const app = await buildApp()

app.listen({ port: config.port, host: '0.0.0.0' }).catch((e) => {
  app.log.error(e)
  process.exit(1)
})
