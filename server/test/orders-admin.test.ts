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
const { setSettings, findCustomer } = await import('../src/db.js')
const { vnNow } = await import('../src/domain/day.js')

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

/** Đặt một đơn qua Trang bán. Khách không hẹn giờ, quán tự liệu lúc nào giao. */
async function placeOrder(customerName: string): Promise<{ id: number }> {
  const menu = (await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
    items: Array<{ id: number; groups: Array<{ options: Array<{ id: number }> }> }>
  }
  const item = menu.items[0]
  const res = await app.inject({
    method: 'POST',
    url: '/api/orders',
    payload: {
      customerName,
      receiveMode: 'pickup',
      location: '',
      note: '',
      paymentMethod: 'cash',
      items: [{ itemId: item.id, qty: 1, optionIds: [item.groups[0].options[0].id] }],
    },
  })
  assert.equal(res.statusCode, 201, res.body)
  return { id: (res.json() as { id: number }).id }
}

test('đơn mới hiện ngay trên màn quản trị mà không cần chọn ngày', async () => {
  const cookie = await login()
  const { id } = await placeOrder('Kiem Thu')

  const pending = await app
    .inject({ url: '/api/admin/orders', headers: { cookie } })
    .then((r) => r.json() as { scope: string; orders: Array<{ id: number; orderDate: string }> })
  assert.equal(pending.scope, 'pending')
  const found = pending.orders.find((o) => o.id === id)
  assert.ok(found, `đơn ${id} phải nằm trong danh sách cần xử lý`)
  assert.equal(found.orderDate, vnNow().date, 'đơn ghi nhận theo ngày đặt')

  // Xem theo ngày lọc đúng ngày đặt.
  const byDate = await app
    .inject({ url: `/api/admin/orders?scope=date&date=${vnNow().date}`, headers: { cookie } })
    .then((r) => r.json() as { orders: Array<{ id: number }> })
  assert.ok(byDate.orders.some((o) => o.id === id))

  const byOtherDate = await app
    .inject({ url: '/api/admin/orders?scope=date&date=1999-01-01', headers: { cookie } })
    .then((r) => r.json() as { orders: Array<{ id: number }> })
  assert.equal(byOtherDate.orders.length, 0)
})

test('đơn Hoàn tất rời khỏi danh sách cần xử lý', async () => {
  const cookie = await login()
  const { id } = await placeOrder('Xong Roi')
  await app.inject({
    method: 'PATCH',
    url: `/api/admin/orders/${id}`,
    headers: { cookie },
    payload: { status: 'done' },
  })
  const pending = await app
    .inject({ url: '/api/admin/orders', headers: { cookie } })
    .then((r) => r.json() as { orders: Array<{ id: number }> })
  assert.ok(!pending.orders.some((o) => o.id === id))
})

test('tên Khách là duy nhất bất kể hoa thường, đơn dùng lại tên đã lưu', async () => {
  const cookie = await login()
  await app.inject({
    method: 'POST',
    url: '/api/admin/customers',
    headers: { cookie },
    payload: { name: 'Hoàng Tuấn', teamsId: '29:abc' },
  })
  // Gõ khác hoa thường và thừa khoảng trắng: vẫn là một người.
  await app.inject({
    method: 'POST',
    url: '/api/admin/customers',
    headers: { cookie },
    payload: { name: '  hoàng   tuấn ', teamsId: '29:abc' },
  })
  const list = await app
    .inject({ url: '/api/admin/customers', headers: { cookie } })
    .then((r) => r.json() as { customers: Array<{ name: string; teamsId: string }> })
  const matches = list.customers.filter((c) => c.name.toLowerCase().includes('tuấn'))
  assert.equal(matches.length, 1, 'chỉ được một dòng cho Hoàng Tuấn')
  // Lần ghi sau quyết định tên hiển thị, và khoảng trắng thừa đã bị gộp.
  assert.equal(matches[0].name, 'hoàng tuấn')

  // Đơn đặt bằng biến thể hoa thường khác vẫn quy về tên đang lưu trong Danh bạ.
  await placeOrder('HOÀNG TUẤN')
  const pending = await app
    .inject({ url: '/api/admin/orders', headers: { cookie } })
    .then((r) => r.json() as { orders: Array<{ customerName: string }> })
  assert.ok(pending.orders.some((o) => o.customerName === matches[0].name))
  assert.ok(!pending.orders.some((o) => o.customerName === 'HOÀNG TUẤN'))
  assert.equal(findCustomer('hoàng tuấn')?.teams_id, '29:abc', 'đặt đơn không được xóa mã Teams')
})

test('cấu hình người nhận thông báo bỏ dòng thiếu mã Teams', async () => {
  const cookie = await login()
  const res = await app.inject({
    method: 'PUT',
    url: '/api/admin/settings',
    headers: { cookie },
    payload: {
      settings: {
        notifyRecipients: JSON.stringify([
          { name: 'Bếp DUKIN', teamsId: '29:bep', email: 'bep@dukin.test' },
          { name: 'Thiếu mã', teamsId: '' },
          { name: '', teamsId: '29:khong-ten' },
        ]),
        notifyCustomerOnNew: '1',
      },
    },
  })
  assert.equal(res.statusCode, 200)
  const s = await app
    .inject({ url: '/api/admin/settings', headers: { cookie } })
    .then((r) => r.json() as { settings: { notifyRecipients: string; notifyCustomerOnNew: string } })
  assert.deepEqual(JSON.parse(s.settings.notifyRecipients), [
    { name: 'Bếp DUKIN', teamsId: '29:bep', email: 'bep@dukin.test' },
  ])
  assert.equal(s.settings.notifyCustomerOnNew, '1')
  setSettings({ notifyRecipients: '[]' })
})

test('đủ trần đơn trong ngày thì Trang bán từ chối đơn mới', async () => {
  const cookie = await login()
  const before = await app
    .inject({ url: '/api/admin/orders?scope=date&date=' + vnNow().date, headers: { cookie } })
    .then((r) => r.json() as { orders: unknown[] })
  setSettings({ dailyCapacity: String(before.orders.length) })
  try {
    const menu = (await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
      items: Array<{ id: number; groups: Array<{ options: Array<{ id: number }> }> }>
    }
    const item = menu.items[0]
    const res = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: {
        customerName: 'Den Muon',
        receiveMode: 'pickup',
        location: '',
        note: '',
        paymentMethod: 'cash',
        items: [{ itemId: item.id, qty: 1, optionIds: [item.groups[0].options[0].id] }],
      },
    })
    assert.equal(res.statusCode, 400)
    assert.match((res.json() as { error: string }).error, /đã nhận đủ đơn/)
    const intake = await app.inject({ url: '/api/intake' }).then((r) => r.json() as { open: boolean })
    assert.equal(intake.open, false)
  } finally {
    setSettings({ dailyCapacity: '0' })
  }
})

test('sửa tên trong Danh bạ thì đơn cũ của người đó đổi tên theo', async () => {
  const cookie = await login()
  // Khách đặt khi chưa có trong Danh bạ: đơn giữ đúng cách khách gõ.
  await placeOrder('lê   THỊ  mai')
  const before = await app
    .inject({ url: '/api/admin/orders', headers: { cookie } })
    .then((r) => r.json() as { orders: Array<{ customerName: string }> })
  assert.ok(before.orders.some((o) => o.customerName === 'lê THỊ mai'))

  // Chủ quán sửa lại chính tả trong Danh bạ.
  await app.inject({
    method: 'POST',
    url: '/api/admin/customers',
    headers: { cookie },
    payload: { name: 'Lê Thị Mai', teamsId: '29:mai' },
  })
  const list = await app
    .inject({ url: '/api/admin/customers', headers: { cookie } })
    .then((r) => r.json() as { customers: Array<{ name: string }> })
  assert.equal(list.customers.filter((c) => c.name.toLowerCase().includes('mai')).length, 1)

  const after = await app
    .inject({ url: '/api/admin/orders', headers: { cookie } })
    .then((r) => r.json() as { orders: Array<{ customerName: string }> })
  assert.ok(after.orders.some((o) => o.customerName === 'Lê Thị Mai'))
  assert.ok(!after.orders.some((o) => o.customerName === 'lê THỊ mai'))
})

test('khác dấu là hai người khác nhau, không gộp', async () => {
  const cookie = await login()
  await app.inject({
    method: 'POST',
    url: '/api/admin/customers',
    headers: { cookie },
    payload: { name: 'Hoang Tuan', teamsId: '29:khac' },
  })
  const list = await app
    .inject({ url: '/api/admin/customers', headers: { cookie } })
    .then((r) => r.json() as { customers: Array<{ name: string }> })
  assert.ok(list.customers.some((c) => c.name === 'Hoang Tuan'))
  assert.ok(list.customers.some((c) => c.name === 'hoàng tuấn'))
})

test('nội dung chuyển khoản dùng tên đã quy chuẩn theo Danh bạ', async () => {
  const cookie = await login()
  // Mã QR chỉ sinh khi đã khai tài khoản nhận tiền.
  setSettings({ bankCode: 'VCB', accountNo: '0123456789', accountName: 'DUKIN CAFE' })
  await app.inject({
    method: 'POST',
    url: '/api/admin/customers',
    headers: { cookie },
    payload: { name: 'Trần Bình', teamsId: '' },
  })
  const menu = (await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
    items: Array<{ id: number; groups: Array<{ options: Array<{ id: number }> }> }>
  }
  const item = menu.items[0]
  // Khách gõ hoa toàn bộ; mã QR phải mang tên trong Danh bạ, không phải tên vừa gõ.
  const res = await app.inject({
    method: 'POST',
    url: '/api/orders',
    payload: {
      customerName: 'TRẦN BÌNH',
      receiveMode: 'pickup',
      location: '',
      note: '',
      paymentMethod: 'transfer',
      items: [{ itemId: item.id, qty: 1, optionIds: [item.groups[0].options[0].id] }],
    },
  })
  assert.equal(res.statusCode, 201)
  const qrUrl = (res.json() as { qrUrl: string | null }).qrUrl
  assert.ok(qrUrl, 'phải có mã QR khi chọn chuyển khoản')
  const memo = new URL(qrUrl).searchParams.get('addInfo') ?? ''
  assert.match(memo, /Tran Binh/, `nội dung chuyển khoản phải theo tên Danh bạ, đang là: ${memo}`)
  assert.doesNotMatch(memo, /TRAN BINH/)
})

test('trần đơn giữ đúng khi nhiều Khách đặt cùng lúc', async () => {
  const cookie = await login()
  const today = vnNow().date
  const before = await app
    .inject({ url: `/api/admin/orders?scope=date&date=${today}`, headers: { cookie } })
    .then((r) => r.json() as { orders: Array<{ status: string }> })
  const active = before.orders.filter((o) => o.status !== 'cancelled').length
  setSettings({ dailyCapacity: String(active + 2) })
  try {
    const menu = (await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
      items: Array<{ id: number; groups: Array<{ options: Array<{ id: number }> }> }>
    }
    const item = menu.items[0]
    const place = (n: number) =>
      app.inject({
        method: 'POST',
        url: '/api/orders',
        payload: {
          customerName: `Dong Thoi ${n}`,
          receiveMode: 'pickup',
          location: '',
          note: '',
          paymentMethod: 'cash',
          items: [{ itemId: item.id, qty: 1, optionIds: [item.groups[0].options[0].id] }],
        },
      })
    const results = await Promise.all([1, 2, 3, 4, 5].map(place))
    const ok = results.filter((r) => r.statusCode === 201).length
    assert.equal(ok, 2, 'chỉ hai đơn lọt qua, đúng bằng số chỗ còn lại')
    assert.equal(results.filter((r) => r.statusCode === 400).length, 3)
  } finally {
    setSettings({ dailyCapacity: '0' })
  }
})

test('tuyến thống kê trả số liệu theo kỳ và chặn tham số sai', async () => {
  const cookie = await login()
  const r = await app
    .inject({ url: '/api/admin/stats?period=day', headers: { cookie } })
    .then((x) => x.json() as { period: string; buckets: unknown[]; total: { orders: number } })
  assert.equal(r.period, 'day')
  assert.equal(r.buckets.length, 14, 'mặc định 14 ngày gần nhất')
  assert.ok(r.total.orders > 0, 'các test trước đã tạo đơn nên phải có số liệu')

  const thang = await app
    .inject({ url: '/api/admin/stats?period=month&span=3', headers: { cookie } })
    .then((x) => x.json() as { period: string; buckets: Array<{ key: string }> })
  assert.equal(thang.period, 'month')
  assert.equal(thang.buckets.length, 3)
  assert.match(thang.buckets[0].key, /^\d{4}-\d{2}$/)

  // Kỳ lạ thì rơi về mặc định, span quá lớn thì bị chặn.
  const la = await app
    .inject({ url: '/api/admin/stats?period=thap-ky', headers: { cookie } })
    .then((x) => x.json() as { period: string })
  assert.equal(la.period, 'day')
  const qua = await app.inject({ url: '/api/admin/stats?span=999', headers: { cookie } })
  assert.equal(qua.statusCode, 400)
})

test('thống kê không tính đơn đã hủy vào doanh thu', async () => {
  const cookie = await login()
  const truoc = await app
    .inject({ url: '/api/admin/stats?period=year&span=1', headers: { cookie } })
    .then((x) => x.json() as { total: { revenue: number; cancelled: number } })

  const { id } = await placeOrder('Huy Ngay')
  const giua = await app
    .inject({ url: '/api/admin/stats?period=year&span=1', headers: { cookie } })
    .then((x) => x.json() as { total: { revenue: number } })
  assert.ok(giua.total.revenue > truoc.total.revenue, 'đơn mới làm doanh thu tăng')

  await app.inject({
    method: 'PATCH',
    url: `/api/admin/orders/${id}`,
    headers: { cookie },
    payload: { status: 'cancelled' },
  })
  const sau = await app
    .inject({ url: '/api/admin/stats?period=year&span=1', headers: { cookie } })
    .then((x) => x.json() as { total: { revenue: number; cancelled: number } })
  assert.equal(sau.total.revenue, truoc.total.revenue, 'hủy xong doanh thu trở lại như cũ')
  assert.equal(sau.total.cancelled, truoc.total.cancelled + 1)
})

test('thống kê cần đăng nhập', async () => {
  const res = await app.inject({ url: '/api/admin/stats' })
  assert.equal(res.statusCode, 401)
})

test('sửa đơn tính lại tiền và trả về đúng những mục đã đổi', async () => {
  const cookie = await login()
  const { id } = await placeOrder('Sua Don')
  const menu = (await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
    items: Array<{ id: number; price: number; groups: Array<{ options: Array<{ id: number; priceAdd: number }> }> }>
  }
  const item = menu.items[0]
  const opt = item.groups[0].options[1] ?? item.groups[0].options[0]

  const res = await app.inject({
    method: 'PUT',
    url: `/api/admin/orders/${id}`,
    headers: { cookie },
    payload: {
      customerName: 'Sua Don',
      receiveMode: 'delivery',
      location: 'Tầng 9',
      note: 'Thêm đá',
      paymentMethod: 'cash',
      items: [{ itemId: item.id, qty: 3, optionIds: [opt.id] }],
    },
  })
  assert.equal(res.statusCode, 200, res.body)
  const body = res.json() as {
    total: number
    location: string
    items: Array<{ qty: number; optionIds: number[] }>
    changes: Array<{ label: string; before: string; after: string }>
  }
  assert.equal(body.total, (item.price + opt.priceAdd) * 3, 'giá tính lại từ Thực đơn')
  assert.equal(body.location, 'Tầng 9')
  assert.equal(body.items[0].qty, 3)
  assert.deepEqual(body.items[0].optionIds, [opt.id], 'mã Tùy chọn được giữ để lần sau sửa tiếp')

  const labels = body.changes.map((c) => c.label)
  assert.ok(labels.includes('Cách nhận') && labels.includes('Vị trí giao'))
  assert.ok(labels.includes('Ghi chú') && labels.includes('Món') && labels.includes('Tổng tiền'))
  assert.ok(!labels.includes('Khách'), 'tên khách không đổi thì không nêu')
})

test('sửa đơn không đụng tới Trạng thái Đơn hàng', async () => {
  const cookie = await login()
  const { id } = await placeOrder('Giu Trang Thai')
  await app.inject({
    method: 'PATCH',
    url: `/api/admin/orders/${id}`,
    headers: { cookie },
    payload: { status: 'confirmed' },
  })
  const menu = (await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
    items: Array<{ id: number; groups: Array<{ options: Array<{ id: number }> }> }>
  }
  const item = menu.items[0]
  const res = await app.inject({
    method: 'PUT',
    url: `/api/admin/orders/${id}`,
    headers: { cookie },
    payload: {
      customerName: 'Giu Trang Thai',
      receiveMode: 'pickup',
      location: '',
      note: 'đổi ghi chú thôi',
      paymentMethod: 'cash',
      items: [{ itemId: item.id, qty: 1, optionIds: [item.groups[0].options[0].id] }],
    },
  })
  assert.equal((res.json() as { status: string }).status, 'confirmed')
})

test('đơn đã hủy thì không sửa được nữa', async () => {
  const cookie = await login()
  const { id } = await placeOrder('Da Huy')
  await app.inject({
    method: 'PATCH',
    url: `/api/admin/orders/${id}`,
    headers: { cookie },
    payload: { status: 'cancelled' },
  })
  const menu = (await app.inject({ url: '/api/menu' }).then((r) => r.json())) as {
    items: Array<{ id: number; groups: Array<{ options: Array<{ id: number }> }> }>
  }
  const item = menu.items[0]
  const res = await app.inject({
    method: 'PUT',
    url: `/api/admin/orders/${id}`,
    headers: { cookie },
    payload: {
      customerName: 'Da Huy',
      receiveMode: 'pickup',
      location: '',
      note: '',
      paymentMethod: 'cash',
      items: [{ itemId: item.id, qty: 5, optionIds: [item.groups[0].options[0].id] }],
    },
  })
  assert.equal(res.statusCode, 400)
  assert.match((res.json() as { error: string }).error, /không sửa được/)
})

test('sửa đơn từ chối dữ liệu hỏng và đơn không có thật', async () => {
  const cookie = await login()
  const { id } = await placeOrder('Kiem Tra Loi')
  const thieuMon = await app.inject({
    method: 'PUT',
    url: `/api/admin/orders/${id}`,
    headers: { cookie },
    payload: {
      customerName: 'Kiem Tra Loi',
      receiveMode: 'pickup',
      location: '',
      note: '',
      paymentMethod: 'cash',
      items: [],
    },
  })
  assert.equal(thieuMon.statusCode, 400)

  const thieuViTri = await app.inject({
    method: 'PUT',
    url: `/api/admin/orders/${id}`,
    headers: { cookie },
    payload: {
      customerName: 'Kiem Tra Loi',
      receiveMode: 'delivery',
      location: '',
      note: '',
      paymentMethod: 'cash',
      items: [{ itemId: 1, qty: 1, optionIds: [] }],
    },
  })
  assert.equal(thieuViTri.statusCode, 400)

  const khongCo = await app.inject({
    method: 'PUT',
    url: '/api/admin/orders/999999',
    headers: { cookie },
    payload: {
      customerName: 'Ai Do',
      receiveMode: 'pickup',
      location: '',
      note: '',
      paymentMethod: 'cash',
      items: [{ itemId: 1, qty: 1, optionIds: [] }],
    },
  })
  assert.equal(khongCo.statusCode, 404)
})
