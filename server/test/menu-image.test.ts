import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

// Dựng sẵn Bảng Món theo lược đồ cũ (chưa có cột ảnh) kèm một Món đang bán,
// để kiểm việc thêm cột là an toàn với dữ liệu đang chạy.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dukin-anh-'))
{
  const cu = new DatabaseSync(path.join(dataDir, 'dukin.sqlite'))
  cu.exec(`
    CREATE TABLE menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_fr TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0
    );
  `)
  cu.prepare(
    "INSERT INTO menu_items(name, name_fr, description, price, sort) VALUES('D. Đen Huyền Bí', 'Le Noir', 'Phin nhỏ giọt', 20000, 1)",
  ).run()
  cu.close()
}

process.env.DATA_DIR = dataDir
process.env.STATIC_DIR = path.join(dataDir, 'khong-co')
process.env.ADMIN_PASSWORD = 'mat-khau-test'

const { buildApp } = await import('../src/app.js')
const { allRows, db } = await import('../src/db.js')
const { decodeImageUpload, MAX_IMAGE_BYTES, newImageFileName } = await import('../src/menu.js')
const { config } = await import('../src/config.js')

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

/** Ảnh WebP nhỏ nhất còn hợp lệ: khối RIFF có nhãn WEBP. */
function anhWebp(thua = 32): Buffer {
  const than = Buffer.alloc(4 + thua, 0x20)
  than.write('WEBP', 0, 'latin1')
  const dau = Buffer.alloc(8)
  dau.write('RIFF', 0, 'latin1')
  dau.writeUInt32LE(than.length, 4)
  return Buffer.concat([dau, than])
}

function anhPng(): Buffer {
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(24)])
}

function anhJpeg(): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(24)])
}

const b64 = (b: Buffer): string => b.toString('base64')

/* --- Tầng miền: hàm kiểm ảnh không đụng đĩa, không đụng HTTP --- */

test('nhận đúng ba loại ảnh cho phép', () => {
  for (const [type, bytes, ext] of [
    ['image/webp', anhWebp(), 'webp'],
    ['image/png', anhPng(), 'png'],
    ['image/jpeg', anhJpeg(), 'jpg'],
  ] as const) {
    const r = decodeImageUpload({ type, data: b64(bytes) })
    assert.equal(r.ok, true, `${type} phải được nhận`)
    if (r.ok) {
      assert.equal(r.ext, ext)
      assert.deepEqual(r.bytes, bytes)
    }
  }
})

test('loại không cho phép bị từ chối ngay từ lời khai', () => {
  for (const type of ['image/gif', 'image/svg+xml', 'application/pdf', 'text/plain', '']) {
    const r = decodeImageUpload({ type, data: b64(anhWebp()) })
    assert.equal(r.ok, false, `${type} không được nhận`)
    if (!r.ok) assert.match(r.error, /WebP, JPEG hoặc PNG/)
  }
})

test('tệp không phải ảnh đội lốt loại cho phép vẫn bị từ chối', () => {
  const r = decodeImageUpload({ type: 'image/webp', data: b64(Buffer.from('day khong phai anh, chi la chu')) })
  assert.equal(r.ok, false)
  if (!r.ok) assert.match(r.error, /không phải ảnh/)
})

test('khai một đằng gửi một nẻo thì từ chối vì nội dung không khớp', () => {
  const r = decodeImageUpload({ type: 'image/png', data: b64(anhWebp()) })
  assert.equal(r.ok, false)
  if (!r.ok) assert.match(r.error, /không khớp loại ảnh/)
})

test('ảnh vượt kích thước bị từ chối, ngay dưới trần thì vẫn qua', () => {
  const qua = decodeImageUpload({ type: 'image/webp', data: b64(anhWebp(MAX_IMAGE_BYTES)) })
  assert.equal(qua.ok, false)
  if (!qua.ok) assert.match(qua.error, /nặng quá/)

  const vua = decodeImageUpload({ type: 'image/webp', data: b64(anhWebp(MAX_IMAGE_BYTES - 12)) })
  assert.equal(vua.ok, true, 'đúng bằng trần thì vẫn nhận')
})

test('chuỗi base64 sai dạng bị từ chối', () => {
  for (const data of ['khong-phai-base64!!', 'AAAA*', 'AAA', '', 'A===', '   ']) {
    const r = decodeImageUpload({ type: 'image/webp', data })
    assert.equal(r.ok, false, `"${data}" không được nhận`)
    if (!r.ok) assert.match(r.error, /base64|Thiếu/)
  }
  assert.equal(decodeImageUpload({ type: 'image/webp' }).ok, false, 'thiếu hẳn chuỗi ảnh')
  assert.equal(decodeImageUpload(null).ok, false, 'thân rỗng')
})

test('hai lần tải sinh hai tên tệp khác nhau', () => {
  const ten = new Set<string>()
  for (let i = 0; i < 500; i++) ten.add(newImageFileName('webp'))
  assert.equal(ten.size, 500, 'không tên nào đụng nhau')
  for (const t of ten) assert.match(t, /^[0-9a-z]+-[0-9a-f]{16}\.webp$/)
})

/* --- Tầng HTTP --- */

test('thêm cột ảnh không đụng tới Món đang bán', () => {
  const cols = allRows<{ name: string }>(db.prepare('PRAGMA table_info(menu_items)')).map((c) => c.name)
  assert.ok(cols.includes('image_file'), 'Bảng Món phải có cột ảnh')
  const rows = allRows<{ name: string; price: number; image_file: string }>(
    db.prepare('SELECT * FROM menu_items'),
  )
  assert.equal(rows.length, 1, 'Món cũ vẫn còn nguyên, không bị gieo đè')
  assert.equal(rows[0].name, 'D. Đen Huyền Bí')
  assert.equal(rows[0].price, 20000)
  assert.equal(rows[0].image_file, '', 'Món cũ đơn giản là chưa có ảnh')
})

test('Thực đơn công khai trả trường ảnh, Món chưa có ảnh thì rỗng', async () => {
  const menu = (await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
    items: Array<{ id: number; image: string }>
  }
  assert.ok(menu.items.length > 0)
  assert.equal(menu.items[0].image, '')
})

test('tải ảnh lên rồi phát ra được ở tiền tố riêng, thay ảnh thì bỏ tệp cũ', async () => {
  const cookie = await login()
  const menu = (await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
    items: Array<{ id: number }>
  }
  const id = menu.items[0].id

  const lan1 = await app.inject({
    method: 'POST',
    url: `/api/admin/menu/${id}/image`,
    headers: { cookie },
    payload: { type: 'image/webp', data: b64(anhWebp()) },
  })
  assert.equal(lan1.statusCode, 200, lan1.body)
  const anh1 = (lan1.json() as { image: string }).image
  assert.match(anh1, /^\/anh-mon\/[0-9a-z-]+\.webp$/)

  // Ảnh nằm trong thư mục dữ liệu đã gắn ổ ngoài, không lẫn với phần tĩnh.
  const ten1 = anh1.slice('/anh-mon/'.length)
  assert.ok(fs.existsSync(path.join(config.imageDir, ten1)))
  assert.equal(path.dirname(config.imageDir), dataDir)

  const phat = await app.inject({ url: anh1 })
  assert.equal(phat.statusCode, 200, 'ảnh phát ra được qua bộ phát tệp tĩnh')
  assert.equal(phat.headers['content-type'], 'image/webp')

  // Thực đơn công khai kèm luôn ảnh, Trang bán không phải hỏi thêm lần nữa.
  const sau = (await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
    items: Array<{ id: number; image: string }>
  }
  assert.equal(sau.items.find((i) => i.id === id)?.image, anh1)

  // Thay ảnh: tên tệp mới khác tên cũ và tệp cũ được dọn đi.
  const lan2 = await app.inject({
    method: 'POST',
    url: `/api/admin/menu/${id}/image`,
    headers: { cookie },
    payload: { type: 'image/png', data: b64(anhPng()) },
  })
  assert.equal(lan2.statusCode, 200, lan2.body)
  const anh2 = (lan2.json() as { image: string }).image
  assert.notEqual(anh2, anh1, 'hai lần tải không đụng tên tệp')
  assert.ok(!fs.existsSync(path.join(config.imageDir, ten1)), 'ảnh cũ được dọn')
  assert.ok(fs.existsSync(path.join(config.imageDir, anh2.slice('/anh-mon/'.length))))
})

test('xóa ảnh thì Món về lại ô chữ và tệp không còn nằm lại', async () => {
  const cookie = await login()
  const id = ((await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
    items: Array<{ id: number; image: string }>
  }).items[0].id

  const truoc = ((await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
    items: Array<{ id: number; image: string }>
  }).items[0].image
  assert.notEqual(truoc, '', 'test trước đã đặt ảnh')

  const res = await app.inject({ method: 'DELETE', url: `/api/admin/menu/${id}/image`, headers: { cookie } })
  assert.equal(res.statusCode, 200, res.body)
  assert.ok(!fs.existsSync(path.join(config.imageDir, truoc.slice('/anh-mon/'.length))))

  const sau = ((await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
    items: Array<{ id: number; image: string }>
  }).items[0].image
  assert.equal(sau, '')
})

test('máy chủ từ chối ảnh sai loại, sai chuỗi và quá khổ qua đường HTTP', async () => {
  const cookie = await login()
  const id = ((await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
    items: Array<{ id: number }>
  }).items[0].id

  const truong = [
    { ten: 'loại không cho phép', payload: { type: 'image/gif', data: b64(anhWebp()) } },
    { ten: 'không phải ảnh', payload: { type: 'image/webp', data: b64(Buffer.from('chu thuan tuy')) } },
    { ten: 'base64 sai dạng', payload: { type: 'image/webp', data: 'khong@phai#base64' } },
    { ten: 'vượt kích thước', payload: { type: 'image/webp', data: b64(anhWebp(MAX_IMAGE_BYTES)) } },
  ]
  for (const t of truong) {
    const res = await app.inject({
      method: 'POST',
      url: `/api/admin/menu/${id}/image`,
      headers: { cookie },
      payload: t.payload,
    })
    assert.equal(res.statusCode, 400, `${t.ten}: ${res.body}`)
  }

  // Không có Món nào mang mã đó thì báo không thấy, không ghi tệp nào cả.
  const truoc = fs.readdirSync(config.imageDir).length
  const lac = await app.inject({
    method: 'POST',
    url: '/api/admin/menu/999999/image',
    headers: { cookie },
    payload: { type: 'image/webp', data: b64(anhWebp()) },
  })
  assert.equal(lac.statusCode, 404, lac.body)
  assert.equal(fs.readdirSync(config.imageDir).length, truoc, 'không để lại tệp mồ côi')
})

test('chưa đăng nhập thì không tải và không xóa được ảnh', async () => {
  const tai = await app.inject({
    method: 'POST',
    url: '/api/admin/menu/1/image',
    payload: { type: 'image/webp', data: b64(anhWebp()) },
  })
  assert.equal(tai.statusCode, 401)
  const xoa = await app.inject({ method: 'DELETE', url: '/api/admin/menu/1/image' })
  assert.equal(xoa.statusCode, 401)
})

test('xóa Món thì ảnh của Món đi theo', async () => {
  const cookie = await login()
  const tao = await app.inject({
    method: 'POST',
    url: '/api/admin/menu',
    headers: { cookie },
    payload: { item: { name: 'Món tạm', nameFr: '', description: '', price: 1000, active: true, sort: 9, groups: [] } },
  })
  assert.equal(tao.statusCode, 201, tao.body)
  const id = (tao.json() as { id: number }).id

  const anh = (
    await app.inject({
      method: 'POST',
      url: `/api/admin/menu/${id}/image`,
      headers: { cookie },
      payload: { type: 'image/jpeg', data: b64(anhJpeg()) },
    })
  ).json() as { image: string }
  const tep = path.join(config.imageDir, anh.image.slice('/anh-mon/'.length))
  assert.ok(fs.existsSync(tep))

  const xoa = await app.inject({ method: 'DELETE', url: `/api/admin/menu/${id}`, headers: { cookie } })
  assert.equal(xoa.statusCode, 200, xoa.body)
  assert.ok(!fs.existsSync(tep), 'ảnh không nằm lại làm rác trong thư mục dữ liệu')
})

test('đường dẫn ảnh không có thật trả 404, không trả trang giao diện', async () => {
  const res = await app.inject({ url: '/anh-mon/khong-co-that.webp' })
  assert.equal(res.statusCode, 404)
})
