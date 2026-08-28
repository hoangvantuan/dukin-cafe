import test from 'node:test'
import assert from 'node:assert/strict'
import { addDays, fmtDateShort, vnClock, vnDate, vnNow } from '../src/domain/day.js'

test('vnNow đổi giờ UTC sang giờ Việt Nam (+7)', () => {
  const t = vnNow(new Date('2026-08-27T02:30:00Z'))
  assert.equal(t.date, '2026-08-27')
  assert.equal(t.minutes, 9 * 60 + 30)
})

test('vnDate và vnClock đọc mốc ISO theo giờ Việt Nam, kể cả khi qua ngày', () => {
  assert.equal(vnDate('2026-08-27T18:30:00Z'), '2026-08-28')
  assert.equal(vnClock('2026-08-27T18:30:00Z'), '01:30')
})

test('addDays qua tháng', () => {
  assert.equal(addDays('2026-08-31', 1), '2026-09-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
})

test('fmtDateShort rút gọn ngày tháng', () => {
  assert.equal(fmtDateShort('2026-08-05'), '05/08')
})
