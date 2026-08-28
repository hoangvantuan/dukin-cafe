import test from 'node:test'
import assert from 'node:assert/strict'
import { changeSummary, diffOrder, lineText, type DiffOrder } from '../src/domain/orderDiff.js'

const goc: DiffOrder = {
  customerName: 'Hoàng Tuấn',
  receiveMode: 'pickup',
  location: '',
  note: '',
  paymentMethod: 'cash',
  total: 40000,
  items: [{ name: 'Đen', optionSummary: 'Vừa', qty: 2, unitPrice: 20000 }],
}

test('không sửa gì thì không có mục nào đổi', () => {
  assert.deepEqual(diffOrder(goc, { ...goc }), [])
  assert.equal(changeSummary([]), 'không có gì đổi')
})

test('chỉ nêu mục thật sự đổi, không kể mục giữ nguyên', () => {
  const moi: DiffOrder = { ...goc, note: 'Ít đá' }
  const d = diffOrder(goc, moi)
  assert.equal(d.length, 1)
  assert.deepEqual(d[0], { label: 'Ghi chú', before: '(không có)', after: 'Ít đá' })
})

test('đổi món kéo theo đổi tổng tiền, cả hai đều được nêu', () => {
  const moi: DiffOrder = {
    ...goc,
    total: 75000,
    items: [
      { name: 'Đen', optionSummary: 'Vừa', qty: 1, unitPrice: 20000 },
      { name: 'Muối Kem', optionSummary: 'Lớn', qty: 1, unitPrice: 55000 },
    ],
  }
  const d = diffOrder(goc, moi)
  const labels = d.map((c) => c.label)
  assert.deepEqual(labels, ['Món', 'Tổng tiền'])
  assert.equal(d[0].before, 'Đen (Vừa) × 2')
  assert.equal(d[0].after, 'Đen (Vừa) × 1\nMuối Kem (Lớn) × 1')
  assert.equal(d[1].before, '40.000đ')
  assert.equal(d[1].after, '75.000đ')
})

test('chuyển sang giao tận nơi nêu cả cách nhận lẫn vị trí', () => {
  const moi: DiffOrder = { ...goc, receiveMode: 'delivery', location: 'Tầng 4' }
  const d = diffOrder(goc, moi)
  assert.deepEqual(d.map((c) => c.label), ['Cách nhận', 'Vị trí giao'])
  assert.equal(d[0].after, 'Giao tận nơi')
  assert.equal(d[1].before, '(không có)')
})

test('xóa hết món vẫn diễn đạt được, không để trống khó hiểu', () => {
  const d = diffOrder(goc, { ...goc, items: [], total: 0 })
  assert.equal(d[0].after, '(không có món nào)')
})

test('tóm tắt liệt kê tên các mục đã đổi', () => {
  const d = diffOrder(goc, { ...goc, note: 'Ít đá', total: 50000 })
  assert.equal(changeSummary(d), 'ghi chú, tổng tiền')
})

test('dòng món không có Tùy chọn thì không thừa dấu ngoặc', () => {
  assert.equal(lineText({ name: 'Đen', optionSummary: '', qty: 3, unitPrice: 20000 }), 'Đen × 3')
})
