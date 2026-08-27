import crypto from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { config } from './config.js'

export const COOKIE_NAME = 'dukin_admin'

export function sessionValue(): string {
  return crypto.createHmac('sha256', config.sessionSecret).update('dukin-admin-session').digest('hex')
}

export function passwordMatches(input: string): boolean {
  const a = crypto.createHash('sha256').update(input).digest()
  const b = crypto.createHash('sha256').update(config.adminPassword).digest()
  return crypto.timingSafeEqual(a, b)
}

export function isAdmin(req: FastifyRequest): boolean {
  const value = req.cookies[COOKIE_NAME]
  return typeof value === 'string' && value.length > 0 && value === sessionValue()
}

export function requireAdmin(req: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void): void {
  if (!isAdmin(req)) {
    void reply.code(401).send({ error: 'Chưa đăng nhập' })
    return
  }
  done()
}

export function setSessionCookie(reply: FastifyReply): void {
  reply.setCookie(COOKIE_NAME, sessionValue(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 3600,
  })
}
