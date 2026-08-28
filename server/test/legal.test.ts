import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Đặt thư mục dữ liệu riêng trước khi nạp db.ts, vì db.ts mở SQLite ngay lúc nạp.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dukin-test-'))
process.env.DATA_DIR = dataDir
process.env.ADMIN_PASSWORD = 'mat-khau-test'

// Hai trang pháp lý là tuyến của ứng dụng một trang, nên máy chủ phải trả
// index.html cho chúng. Dựng sẵn một thư mục tĩnh thật để kiểm việc đó.
const staticDir = path.join(dataDir, 'web-dist')
fs.mkdirSync(staticDir, { recursive: true })
fs.writeFileSync(path.join(staticDir, 'index.html'), '<!DOCTYPE html><html lang="vi"><body>DUKIN</body></html>')
process.env.STATIC_DIR = staticDir

const { buildApp } = await import('../src/app.js')
const { setSettings } = await import('../src/db.js')

const app = await buildApp()
test.after(async () => {
  await app.close()
  fs.rmSync(dataDir, { recursive: true, force: true })
})

test('hai trang pháp lý đọc được ở tuyến tiếng Việt riêng', async () => {
  for (const url of ['/quyen-rieng-tu', '/dieu-khoan-su-dung']) {
    const res = await app.inject({ url })
    assert.equal(res.statusCode, 200, `${url}: ${res.body}`)
    assert.match(res.headers['content-type'] as string, /text\/html/)
    assert.match(res.body, /DUKIN/)
  }
})

test('cấu hình công khai trả email liên hệ, mặc định rỗng', async () => {
  const res = await app.inject({ url: '/api/public-config' })
  assert.equal(res.statusCode, 200, res.body)
  const cfg = res.json() as { zaloLink: string; contactEmail: string }
  assert.equal(cfg.contactEmail, '')
  assert.equal(cfg.zaloLink, '')
})

test('email liên hệ đã khai thì cấu hình công khai trả đúng giá trị đó', async () => {
  setSettings({ contactEmail: 'quan@dukin.example', zaloLink: 'https://zalo.me/dukin' })
  const cfg = (await app.inject({ url: '/api/public-config' })).json() as {
    zaloLink: string
    contactEmail: string
  }
  assert.equal(cfg.contactEmail, 'quan@dukin.example')
  // Đường Zalo vẫn trả về: trang pháp lý tự chọn kênh nào hiện, máy chủ không chọn hộ.
  assert.equal(cfg.zaloLink, 'https://zalo.me/dukin')
})
