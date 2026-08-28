import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildKeys,
  periodKey,
  periodLabel,
  prevKey,
  summarize,
  weekStart,
  type StatLine,
  type StatOrder,
} from '../src/domain/stats.js'

test('tuần bắt đầu từ thứ Hai', () => {
  // 2026-08-28 là thứ Sáu, đầu tuần là thứ Hai 24/08.
  assert.equal(weekStart('2026-08-28'), '2026-08-24')
  assert.equal(weekStart('2026-08-24'), '2026-08-24', 'chính thứ Hai thì giữ nguyên')
  assert.equal(weekStart('2026-08-30'), '2026-08-24', 'Chủ nhật thuộc tuần trước đó')
  assert.equal(weekStart('2026-08-31'), '2026-08-31', 'thứ Hai kế tiếp sang tuần mới')
})

test('khóa gộp theo từng kỳ', () => {
  assert.equal(periodKey('2026-08-28', 'day'), '2026-08-28')
  assert.equal(periodKey('2026-08-28', 'week'), '2026-08-24')
  assert.equal(periodKey('2026-08-28', 'month'), '2026-08')
  assert.equal(periodKey('2026-08-28', 'year'), '2026')
})

test('lùi kỳ qua mốc năm và mốc tháng', () => {
  assert.equal(prevKey('2026-01', 'month'), '2025-12')
  assert.equal(prevKey('2026-03', 'month'), '2026-02')
  assert.equal(prevKey('2026-01-01', 'day'), '2025-12-31')
  assert.equal(prevKey('2026-08-24', 'week'), '2026-08-17')
  assert.equal(prevKey('2026', 'year'), '2025')
})

test('nhãn kỳ đọc được bằng tiếng Việt', () => {
  assert.equal(periodLabel('2026-08-28', 'day'), '28/08')
  assert.equal(periodLabel('2026-08-24', 'week'), '24/08 tới 30/08')
  assert.equal(periodLabel('2026-08', 'month'), 'Tháng 8/2026')
  assert.equal(periodLabel('2026', 'year'), 'Năm 2026')
})

test('dải mốc liên tục, kỳ không có đơn vẫn có chỗ', () => {
  const keys = buildKeys('2026-08-28', 'day', 3)
  assert.deepEqual(keys, ['2026-08-26', '2026-08-27', '2026-08-28'])
  assert.deepEqual(buildKeys('2026-01-02', 'month', 3), ['2025-11', '2025-12', '2026-01'])
})

const orders: StatOrder[] = [
  { orderDate: '2026-08-28', status: 'done', total: 50000, channel: 'web', receiveMode: 'delivery', paymentMethod: 'transfer', customerKey: 'tuấn', customerName: 'Tuấn' },
  { orderDate: '2026-08-28', status: 'new', total: 20000, channel: 'zalo', receiveMode: 'pickup', paymentMethod: 'cash', customerKey: 'tuấn', customerName: 'Tuấn' },
  { orderDate: '2026-08-28', status: 'cancelled', total: 90000, channel: 'web', receiveMode: 'pickup', paymentMethod: 'cash', customerKey: 'mai', customerName: 'Mai' },
  { orderDate: '2026-08-27', status: 'done', total: 30000, channel: 'web', receiveMode: 'pickup', paymentMethod: 'cash', customerKey: 'mai', customerName: 'Mai' },
  // Đơn cũ, nằm ngoài dải ba ngày.
  { orderDate: '2026-07-01', status: 'done', total: 1000000, channel: 'web', receiveMode: 'pickup', paymentMethod: 'cash', customerKey: 'cu', customerName: 'Cũ' },
]

const lines: StatLine[] = [
  { orderDate: '2026-08-28', status: 'done', name: 'Bạc Xỉu', optionSummary: 'Lớn', qty: 2, unitPrice: 25000 },
  { orderDate: '2026-08-28', status: 'new', name: 'Đen', optionSummary: 'Vừa', qty: 1, unitPrice: 20000 },
  { orderDate: '2026-08-28', status: 'cancelled', name: 'Đen', optionSummary: 'Vừa', qty: 9, unitPrice: 10000 },
  { orderDate: '2026-08-27', status: 'done', name: 'Bạc Xỉu', optionSummary: 'Lớn', qty: 1, unitPrice: 30000 },
  { orderDate: '2026-07-01', status: 'done', name: 'Đen', optionSummary: 'Vừa', qty: 40, unitPrice: 25000 },
]

test('doanh thu bỏ đơn hủy và bỏ đơn ngoài dải', () => {
  const r = summarize({ orders, lines, period: 'day', today: '2026-08-28', span: 3 })
  assert.equal(r.total.orders, 3, 'ba đơn còn hiệu lực trong ba ngày gần nhất')
  assert.equal(r.total.cancelled, 1)
  assert.equal(r.total.revenue, 100000, '50k + 20k + 30k, không tính đơn hủy 90k và đơn tháng 7')
  assert.equal(r.total.customers, 2)
  assert.equal(r.total.avgOrder, 33333)
  assert.equal(r.total.cups, 4, '2 + 1 ly ngày 28, 1 ly ngày 27; bỏ 9 ly của đơn hủy')
})

test('mỗi ngày một cột, ngày không bán vẫn hiện', () => {
  const r = summarize({ orders, lines, period: 'day', today: '2026-08-28', span: 3 })
  assert.deepEqual(r.buckets.map((b) => b.key), ['2026-08-26', '2026-08-27', '2026-08-28'])
  assert.deepEqual(r.buckets.map((b) => b.orders), [0, 1, 2])
  assert.deepEqual(r.buckets.map((b) => b.revenue), [0, 30000, 70000])
  assert.deepEqual(r.buckets.map((b) => b.cancelled), [0, 0, 1])
  assert.deepEqual(r.buckets.map((b) => b.customers), [0, 1, 1])
})

test('gộp theo tuần dồn hai ngày vào cùng một cột', () => {
  const r = summarize({ orders, lines, period: 'week', today: '2026-08-28', span: 1 })
  assert.equal(r.buckets.length, 1)
  assert.equal(r.buckets[0].key, '2026-08-24')
  assert.equal(r.buckets[0].orders, 3)
  assert.equal(r.buckets[0].revenue, 100000)
  assert.equal(r.buckets[0].customers, 2)
})

test('gộp theo tháng và theo năm gom cả đơn cũ khi dải đủ rộng', () => {
  const thang = summarize({ orders, lines, period: 'month', today: '2026-08-28', span: 2 })
  assert.deepEqual(thang.buckets.map((b) => b.key), ['2026-07', '2026-08'])
  assert.equal(thang.buckets[0].revenue, 1000000)
  assert.equal(thang.buckets[1].revenue, 100000)

  const nam = summarize({ orders, lines, period: 'year', today: '2026-08-28', span: 1 })
  assert.equal(nam.buckets[0].key, '2026')
  assert.equal(nam.buckets[0].revenue, 1100000, 'cả năm gom hết đơn còn hiệu lực')
})

test('tình trạng đặt đơn đếm mọi đơn, kể cả đơn treo từ trước dải', () => {
  const r = summarize({ orders, lines, period: 'day', today: '2026-08-28', span: 1 })
  const m = Object.fromEntries(r.byStatus.map((x) => [x.status, x.count]))
  assert.deepEqual(m, { done: 3, new: 1, cancelled: 1 })
})

test('món bán chạy và khách quen xếp đúng thứ tự', () => {
  const r = summarize({ orders, lines, period: 'day', today: '2026-08-28', span: 3 })
  assert.equal(r.topItems[0].name, 'Bạc Xỉu')
  assert.equal(r.topItems[0].qty, 3, 'gộp 2 ly ngày 28 với 1 ly ngày 27')
  assert.equal(r.topItems[0].revenue, 80000)
  assert.ok(!r.topItems.some((i) => i.qty === 9), 'đơn hủy không tính vào món bán chạy')

  assert.equal(r.topCustomers[0].name, 'Tuấn')
  assert.equal(r.topCustomers[0].orders, 2)
  assert.equal(r.topCustomers[0].revenue, 70000)
})

test('kênh đặt, cách nhận và cách trả tiền đếm trên đơn còn hiệu lực', () => {
  const r = summarize({ orders, lines, period: 'day', today: '2026-08-28', span: 3 })
  assert.deepEqual(Object.fromEntries(r.byChannel.map((x) => [x.channel, x.count])), { web: 2, zalo: 1 })
  assert.deepEqual(Object.fromEntries(r.byReceiveMode.map((x) => [x.mode, x.count])), { delivery: 1, pickup: 2 })
  assert.deepEqual(Object.fromEntries(r.byPayment.map((x) => [x.method, x.count])), { transfer: 1, cash: 2 })
})

test('chưa bán đơn nào thì trả số không, không lỗi chia cho không', () => {
  const r = summarize({ orders: [], lines: [], period: 'day', today: '2026-08-28', span: 2 })
  assert.equal(r.total.orders, 0)
  assert.equal(r.total.revenue, 0)
  assert.equal(r.total.avgOrder, 0)
  assert.equal(r.buckets.length, 2)
  assert.deepEqual(r.topItems, [])
})
