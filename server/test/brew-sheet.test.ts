import test from 'node:test'
import assert from 'node:assert/strict'
import { brewSheet, type BrewLine } from '../src/domain/brewSheet.js'

const lines: BrewLine[] = [
  // Hai đơn khác nhau cùng gọi Bạc Xỉu cỡ Lớn: phải cộng dồn thành một dòng.
  { status: 'new', name: 'Bạc Xỉu', optionSummary: 'Lớn', qty: 2 },
  { status: 'confirmed', name: 'Bạc Xỉu', optionSummary: 'Lớn', qty: 3 },
  // Cùng Món nhưng khác Tùy chọn: tách dòng riêng.
  { status: 'paid', name: 'Bạc Xỉu', optionSummary: 'Vừa', qty: 1 },
  { status: 'new', name: 'Đen Đá', optionSummary: '', qty: 4 },
  // Đơn đã đóng, không phải pha nữa.
  { status: 'done', name: 'Bạc Xỉu', optionSummary: 'Lớn', qty: 50 },
  { status: 'cancelled', name: 'Đen Đá', optionSummary: '', qty: 90 },
]

test('danh sách rỗng trả bảng rỗng, không lỗi', () => {
  const r = brewSheet([])
  assert.deepEqual(r.rows, [])
  assert.equal(r.totalCups, 0)
})

test('gộp đúng theo cặp Món và Tùy chọn', () => {
  const r = brewSheet(lines)
  assert.deepEqual(r.rows, [
    { name: 'Bạc Xỉu', optionSummary: 'Lớn', qty: 5 },
    { name: 'Bạc Xỉu', optionSummary: 'Vừa', qty: 1 },
    { name: 'Đen Đá', optionSummary: '', qty: 4 },
  ])
})

test('nhiều đơn chứa cùng cặp thì cộng dồn số ly', () => {
  const r = brewSheet([
    { status: 'new', name: 'Đen Đá', optionSummary: 'Ít đường', qty: 1 },
    { status: 'confirmed', name: 'Đen Đá', optionSummary: 'Ít đường', qty: 2 },
    { status: 'paid', name: 'Đen Đá', optionSummary: 'Ít đường', qty: 4 },
  ])
  assert.equal(r.rows.length, 1, 'ba đơn gộp về đúng một dòng')
  assert.equal(r.rows[0].qty, 7)
})

test('đơn đã Hoàn tất và đã Hủy không tính vào', () => {
  const r = brewSheet(lines)
  assert.ok(!r.rows.some((x) => x.qty >= 50), 'không dòng nào mang số ly của đơn đã đóng')

  const chiDonDong = brewSheet([
    { status: 'done', name: 'Bạc Xỉu', optionSummary: 'Lớn', qty: 3 },
    { status: 'cancelled', name: 'Đen Đá', optionSummary: '', qty: 7 },
  ])
  assert.deepEqual(chiDonDong.rows, [], 'chỉ toàn đơn đã đóng thì bảng trống')
  assert.equal(chiDonDong.totalCups, 0)
})

test('tổng số ly bằng tổng các dòng trong hàng đợi xử lý', () => {
  const r = brewSheet(lines)
  assert.equal(r.totalCups, 10, '5 + 1 + 4, bỏ 50 ly đơn hoàn tất và 90 ly đơn hủy')
  assert.equal(
    r.totalCups,
    r.rows.reduce((s, x) => s + x.qty, 0),
  )
})
