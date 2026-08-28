import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Đặt thư mục dữ liệu riêng trước khi nạp db.ts, vì db.ts mở SQLite ngay lúc nạp.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dukin-test-'))
process.env.DATA_DIR = dataDir
process.env.STATIC_DIR = path.join(dataDir, 'khong-co')
process.env.ADMIN_PASSWORD = 'mat-khau-test'

const { buildApp } = await import('../src/app.js')
const { setSettings } = await import('../src/db.js')
const { MAX_BREWERS } = await import('../src/domain/brewers.js')

const app = await buildApp()
test.after(async () => {
  await app.close()
  fs.rmSync(dataDir, { recursive: true, force: true })
})

const login = async (): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/admin/login',
    payload: { password: 'mat-khau-test' },
  })
  const cookie = res.cookies[0]
  return `${cookie.name}=${cookie.value}`
}

const publicBrewers = async (): Promise<string[]> => {
  const res = await app.inject({ url: '/api/public-config' })
  assert.equal(res.statusCode, 200, res.body)
  return (res.json() as { brewers: string[] }).brewers
}

test('chưa khai Người pha thì cấu hình công khai trả danh sách rỗng', async () => {
  assert.deepEqual(await publicBrewers(), [])
})

test('cấu hình công khai trả đủ tên Người pha, giữ đúng thứ tự đã nhập', async () => {
  setSettings({ brewers: JSON.stringify(['Người Pha Một', 'Người Pha Hai', 'Người Pha Ba']) })
  assert.deepEqual(await publicBrewers(), ['Người Pha Một', 'Người Pha Hai', 'Người Pha Ba'])
})

test('danh sách Người pha bỏ tên rỗng, gộp khoảng trắng và bỏ tên trùng', async () => {
  setSettings({
    brewers: JSON.stringify(['  Người   Pha   Một ', '', 'người pha một', 'Người Pha Hai', 42, null]),
  })
  assert.deepEqual(await publicBrewers(), ['Người Pha Một', 'Người Pha Hai'])
})

test('giá trị hỏng trong Cấu hình không làm sập cấu hình công khai', async () => {
  setSettings({ brewers: 'khong-phai-json' })
  assert.deepEqual(await publicBrewers(), [])
  setSettings({ brewers: '{"a":1}' })
  assert.deepEqual(await publicBrewers(), [])
})

test('Trang quản lý lưu và đọc lại được danh sách Người pha', async () => {
  const cookie = await login()
  const saved = await app.inject({
    method: 'PUT',
    url: '/api/admin/settings',
    headers: { cookie },
    payload: { settings: { brewers: JSON.stringify(['Người Pha Ba', ' Người Pha Ba ', 'Người Pha Hai']) } },
  })
  assert.equal(saved.statusCode, 200, saved.body)

  const got = await app.inject({ url: '/api/admin/settings', headers: { cookie } })
  const settings = (got.json() as { settings: { brewers: string } }).settings
  // Tuyến lưu chuẩn hóa sẵn, nên màn Cấu hình không bày ra dòng trùng.
  assert.deepEqual(JSON.parse(settings.brewers), ['Người Pha Ba', 'Người Pha Hai'])
  assert.deepEqual(await publicBrewers(), ['Người Pha Ba', 'Người Pha Hai'])
})

test('quá số Người pha cho phép thì tuyến lưu từ chối, không cắt bớt lặng lẽ', async () => {
  const cookie = await login()
  const many = Array.from({ length: MAX_BREWERS + 1 }, (_, i) => `Người pha ${i + 1}`)
  const res = await app.inject({
    method: 'PUT',
    url: '/api/admin/settings',
    headers: { cookie },
    payload: { settings: { brewers: JSON.stringify(many) } },
  })
  assert.equal(res.statusCode, 400, res.body)
  // Danh sách cũ còn nguyên, lần lưu hỏng không xóa mất cấu hình đang chạy.
  assert.deepEqual(await publicBrewers(), ['Người Pha Ba', 'Người Pha Hai'])
})
